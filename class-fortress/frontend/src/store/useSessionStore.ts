import { create } from 'zustand';
import type { Session, SessionMode, SessionStatus } from '../types/session';

// ── Session config (sent with session start) ──────────────────────────────────
export interface SessionConfig {
  breakDurationMin: number;
  autoLockAfterReturn: boolean;
  gestureDetection: boolean;
  phoneTolerance: number;
  motionSensitivity: 'low' | 'medium' | 'high';
  alertSound: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  breakDurationMin: 10,
  autoLockAfterReturn: true,
  gestureDetection: true,
  phoneTolerance: 0,
  motionSensitivity: 'medium',
  alertSound: false,
};

interface SessionStore {
  // State
  currentSession: Session | null;
  mode: SessionMode;
  status: SessionStatus;
  courseId: string;
  uptime: number;
  config: SessionConfig;

  // Internal
  _uptimeInterval: ReturnType<typeof setInterval> | null;

  // Actions
  setMode: (mode: SessionMode) => void;
  setCourseId: (id: string) => void;
  updateConfig: (patch: Partial<SessionConfig>) => void;
  startSession: (session: Session) => void;
  endSession: () => void;

  _tickUptime: () => void;
  _startUptimeTimer: () => void;
  _stopUptimeTimer: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  currentSession: null,
  mode: 'class',
  status: 'idle',
  courseId: 'CS280',
  uptime: 0,
  config: DEFAULT_CONFIG,
  _uptimeInterval: null,

  setMode: (mode) => set({ mode }),
  setCourseId: (id) => set({ courseId: id }),
  updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  startSession: (session) => {
    set({ currentSession: session, status: 'active', uptime: 0, mode: session.mode });
    get()._startUptimeTimer();
  },

  endSession: () => {
    get()._stopUptimeTimer();
    set((s) => ({
      currentSession: s.currentSession
        ? { ...s.currentSession, ended_at: new Date().toISOString() }
        : null,
      status: 'idle',
      uptime: 0,
    }));
  },

  _tickUptime: () => set((s) => ({ uptime: s.uptime + 1 })),

  _startUptimeTimer: () => {
    const interval = setInterval(() => get()._tickUptime(), 1000);
    set({ _uptimeInterval: interval });
  },

  _stopUptimeTimer: () => {
    const interval = get()._uptimeInterval;
    if (interval) clearInterval(interval);
    set({ _uptimeInterval: null });
  },
}));
