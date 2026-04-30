import { useMutation } from '@tanstack/react-query';
import { respondToGesture } from '../api/client';
import { useAttendanceStore } from '../store/useAttendanceStore';

export function useGestures() {
  const pendingGestures = useAttendanceStore((s) => s.pendingGestures);
  const removePendingGesture = useAttendanceStore((s) => s.removePendingGesture);

  const respondMutation = useMutation({
    mutationFn: ({ gesture_id, decision }: { gesture_id: string; decision: 'approve' | 'deny' }) =>
      respondToGesture(gesture_id, decision),
    onSuccess: (_, variables) => {
      removePendingGesture(variables.gesture_id);
    },
  });

  const approve = (gesture_id: string) =>
    respondMutation.mutate({ gesture_id, decision: 'approve' });

  const deny = (gesture_id: string) =>
    respondMutation.mutate({ gesture_id, decision: 'deny' });

  return {
    pendingGestures,
    approve,
    deny,
    isResponding: respondMutation.isPending,
  };
}
