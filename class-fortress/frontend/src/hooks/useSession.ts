import { useMutation } from '@tanstack/react-query';
import { startSession, endSession } from '../api/client';
import { useSessionStore } from '../store/useSessionStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useHardwareStore } from '../store/useHardwareStore';
import type { Session } from '../types/session';

export function useSession() {
  const mode = useSessionStore((s) => s.mode);
  const courseId = useSessionStore((s) => s.courseId);
  const currentSession = useSessionStore((s) => s.currentSession);
  const status = useSessionStore((s) => s.status);
  const _startSession = useSessionStore((s) => s.startSession);
  const _endSession = useSessionStore((s) => s.endSession);
  const clearAll = useAttendanceStore((s) => s.clearAll);
  const setSolenoidState = useHardwareStore((s) => s.setSolenoidState);
  const triggerSolenoidAnimation = useHardwareStore((s) => s.triggerSolenoidAnimation);

  const startMutation = useMutation({
    mutationFn: () => startSession({ mode, course_id: courseId }),
    onSuccess: (data) => {
      const session: Session = {
        session_id: data.session_id,
        mode: data.mode,
        course_id: data.course_id,
        started_at: data.started_at,
        solenoid_state: data.solenoid_state,
      };
      _startSession(session);
      setSolenoidState(data.solenoid_state);
      triggerSolenoidAnimation();
      
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    },
  });

  const endMutation = useMutation({
    mutationFn: () => endSession({ session_id: currentSession!.session_id }),
    onSuccess: () => {
      _endSession();
      clearAll();
      setSolenoidState('locked');
    },
  });

  return {
    session: currentSession,
    status,
    startSession: startMutation.mutate,
    endSession: endMutation.mutate,
    isStarting: startMutation.isPending,
    isEnding: endMutation.isPending,
    startError: startMutation.error,
    endError: endMutation.error,
  };
}
