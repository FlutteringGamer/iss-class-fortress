import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { respondToGesture } from '../../api/client';
import { useAttendanceStore } from '../../store/useAttendanceStore';

export function GestureAlert({ gestureId }: { gestureId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'approved' | 'denied' | null>(null);
  const removePendingGesture = useAttendanceStore((s) => s.removePendingGesture);
  const incrementGesturesHandled = useAttendanceStore((s) => s.incrementGesturesHandled);

  const mutation = useMutation({
    mutationFn: respondToGesture,
    onMutate: () => setLoading(true),
    onSuccess: (data) => {
      setResult(data.decision === 'approve' ? 'approved' : 'denied');
      incrementGesturesHandled();
      // Wait a moment then remove from pending to update log UI
      setTimeout(() => removePendingGesture(gestureId), 1500);
    },
    onSettled: () => setLoading(false),
  });

  if (result) {
    return (
      <span style={{ 
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
        color: result === 'approved' ? 'var(--green)' : 'var(--red)'
      }}>
        {result === 'approved' ? '✓ APPROVED' : '✕ DENIED'}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button 
        className="btn" 
        style={{ 
          background: 'rgba(34,197,94,0.1)', 
          color: 'var(--green)', 
          border: '1px solid rgba(34,197,94,0.3)',
          padding: '4px 8px', fontSize: 10 
        }}
        onClick={() => mutation.mutate({ gesture_id: gestureId, decision: 'approve' })}
        disabled={loading}
      >
        APPROVE
      </button>
      <button 
        className="btn" 
        style={{ 
          background: 'rgba(239,68,68,0.1)', 
          color: 'var(--red)', 
          border: '1px solid rgba(239,68,68,0.3)',
          padding: '4px 8px', fontSize: 10 
        }}
        onClick={() => mutation.mutate({ gesture_id: gestureId, decision: 'deny' })}
        disabled={loading}
      >
        DENY
      </button>
    </div>
  );
}
