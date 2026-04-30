import React from 'react';
import { format } from 'date-fns';
import { GestureAlert } from './GestureAlert';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import type { EventMessage } from '../../types/event';

function getIcon(type: string) {
  switch (type) {
    case 'gesture':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 11.232c0 2.222-1.778 4.768-4 4.768S10 13.454 10 11.232V6.5a2.5 2.5 0 015 0v4.732z" />
          <path d="M15 15.5c-3 1.5-6-1.5-6-5.5V5M11.5 5a2 2 0 012-2 2 2 0 012 2" />
        </svg>
      );
    case 'door_event':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'face_detected':
    case 'attendance_update':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

export function EventEntry({ event, newlyInserted }: { event: EventMessage, newlyInserted?: boolean }) {
  const pendingGestures = useAttendanceStore((s) => s.pendingGestures);
  const isPending = event.type === 'gesture' && pendingGestures.some(g => g.gesture_id === event.payload?.gesture_id);

  const tColor = event.severity === 'critical' ? 'var(--red)' : event.severity === 'warning' ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      minHeight: 40, borderBottom: '1px solid var(--border)',
      padding: '8px 4px',
      backgroundColor: 'transparent',
      animation: newlyInserted ? 'slide-in-top 150ms ease-out' : 'none'
    }}>
      <div style={{ width: 3, height: '100%', minHeight: 24, backgroundColor: tColor, borderRadius: 2 }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        {format(new Date(event.timestamp), 'HH:mm:ss')}
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        {getIcon(event.type)}
      </div>
      <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
        {event.student_name ? <strong>{event.student_name}: </strong> : null}
        {event.type === 'gesture' ? `${event.payload?.gesture_type} detected` : 
         event.type === 'door_event' ? `Door ${event.payload?.action}ed (${event.payload?.reason || 'System'})` :
         event.type === 'face_detected' ? `Face identified (${Math.round(event.payload.confidence * 100)}% match)` :
         event.type === 'motion_alert' ? event.payload?.description :
         event.payload?.message || String(event.type)}
      </div>
      {isPending && event.requires_action && (
        <GestureAlert gestureId={event.payload.gesture_id} />
      )}
    </div>
  );
}
