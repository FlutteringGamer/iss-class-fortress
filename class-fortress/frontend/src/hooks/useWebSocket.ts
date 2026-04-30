/**
 * useWebSocket — connects to ws://localhost:8000/ws/events
 * - Auto-reconnects with exponential backoff (max 5 retries, then stops)
 * - On message: parses EventMessage and dispatches to appropriate Zustand store
 * - Exposes: isConnected, lastEvent, connectionAttempts
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useHardwareStore } from '../store/useHardwareStore';
import { useSessionStore } from '../store/useSessionStore';
import type { EventMessage, PendingGesture } from '../types/event';
import type { Student } from '../types/student';

const WS_URL = 'ws://localhost:8000/ws/events';
const BASE_DELAY_MS = 1000;
const MAX_RETRIES = 5;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const retryCount = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<EventMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Store selectors
  const addEvent        = useAttendanceStore((s) => s.addEvent);
  const addPendingGesture = useAttendanceStore((s) => s.addPendingGesture);
  const setStudents     = useAttendanceStore((s) => s.setStudents);
  const markPresent     = useAttendanceStore((s) => s.markPresent);
  const markAbsent      = useAttendanceStore((s) => s.markAbsent);
  const startBreak      = useAttendanceStore((s) => s.startBreak);
  const setSolenoidState = useHardwareStore((s) => s.setSolenoidState);
  const triggerSolenoidAnimation = useHardwareStore((s) => s.triggerSolenoidAnimation);

  /** Dispatch a parsed EventMessage to the correct store(s). */
  const dispatch = useCallback((msg: EventMessage) => {
    addEvent(msg);
    setLastEvent(msg);

    switch (msg.type) {
      case 'attendance_update': {
        const p = msg.payload as {
          records?: Array<{ student_id: string; student_name: string; status: string }>;
          status?: string;
        };
        if (p.records) {
          // Full roster snapshot
          const students: Student[] = p.records.map((r) => ({
            id: r.student_id,
            name: r.student_name,
            student_number: '',
            course_id: '',
            status: r.status as Student['status'],
          }));
          setStudents(students);
        } else if (msg.student_id && p.status) {
          // Single student update
          if (p.status === 'present') markPresent(msg.student_id);
          else if (p.status === 'absent') markAbsent(msg.student_id);
          else if (p.status === 'break' && msg.student_name) {
            startBreak(msg.student_id, msg.student_name, 10);
          }
        }
        break;
      }

      case 'gesture': {
        if (msg.requires_action && msg.student_id) {
          const p = msg.payload as {
            gesture_id: string;
            gesture_type: string;
            confidence: number;
          };
          const gesture: PendingGesture = {
            gesture_id: p.gesture_id,
            gesture_type: p.gesture_type as PendingGesture['gesture_type'],
            student_id: msg.student_id,
            student_name: msg.student_name ?? 'Unknown',
            detected_at: msg.timestamp,
            confidence: p.confidence,
          };
          addPendingGesture(gesture);
        }
        break;
      }

      case 'door_event': {
        const p = msg.payload as { state?: string; new_state?: string };
        const state = (p.state ?? p.new_state) as 'locked' | 'unlocked' | undefined;
        if (state) {
          setSolenoidState(state);
          triggerSolenoidAnimation();
        }
        break;
      }

      case 'timer_update': {
        const p = msg.payload as {
          action: string;
          duration_minutes: number;
          student_id: string;
          student_name: string;
        };
        if (p.action === 'start' && p.student_id) {
          startBreak(p.student_id, p.student_name, p.duration_minutes);
        }
        break;
      }

      case 'face_detected': {
        if (msg.student_id) {
          markPresent(msg.student_id);
        }
        break;
      }

      case 'alert': {
        if (msg.severity === 'critical' && Notification.permission === 'granted') {
          new Notification('Class Fortress Alert', { body: msg.payload?.message || 'Critical alert received.' });
        }
        break;
      }

      // session_event, phone_count, motion_alert
      // → already added to event log via addEvent above; no extra dispatch needed
    }
  }, [addEvent, addPendingGesture, setStudents, markPresent, markAbsent, startBreak,
      setSolenoidState, triggerSolenoidAnimation]);

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    setConnectionAttempts((n) => n + 1);

    try {
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected');
        retryCount.current = 0;
        setIsConnected(true);

        // Keepalive ping every 25s
        const pingId = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          } else {
            clearInterval(pingId);
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const msg: EventMessage = JSON.parse(event.data as string);
          dispatch(msg);
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (!isMounted.current) return;
        if (retryCount.current >= MAX_RETRIES) {
          console.warn(`[WS] Max retries (${MAX_RETRIES}) reached. Giving up.`);
          return;
        }
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount.current); // exp backoff
        retryCount.current += 1;
        console.warn(`[WS] Disconnected — retry ${retryCount.current}/${MAX_RETRIES} in ${delay}ms`);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (e) {
      console.error('[WS] Failed to create socket:', e);
    }
  }, [dispatch]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { isConnected, lastEvent, connectionAttempts };
}
