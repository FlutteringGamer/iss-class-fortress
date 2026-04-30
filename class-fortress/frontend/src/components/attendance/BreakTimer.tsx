import React, { useState, useEffect } from 'react';
import { respondToGesture } from '../../api/client';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import type { BreakTimer } from '../../types/student';

export function BreakTimerCard({ timer }: { timer: BreakTimer }) {
  const [now, setNow] = useState(Date.now());
  const [extended, setExtended] = useState(false);
  const markPresent = useAttendanceStore((s) => s.markPresent);
  const endBreakStore = useAttendanceStore((s) => s.endBreak);
  const updateTimers = useAttendanceStore((s) => s.updateTimers);

  useEffect(() => {
    const intv = setInterval(() => {
      setNow(Date.now());
      updateTimers(); // this will auto-mark absent if expired
    }, 1000);
    return () => clearInterval(intv);
  }, [updateTimers]);

  const endsAt = new Date(timer.ends_at).getTime();
  const remainingMs = Math.max(0, endsAt - now);
  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
  const totalMs = timer.duration_minutes * 60000;
  const progress = Math.min(1, remainingMs / totalMs);

  const isExpired = remainingMs === 0;
  const isPulse = remainingMs > 0 && remainingMs <= 120000; // 2 minutes

  const handleReturn = async () => {
    try {
      await respondToGesture({ gesture_id: 'RETURN-' + timer.student_id, decision: 'approve' });
    } catch (e) {
      // Ignored for mock
    }
    markPresent(timer.student_id);
    endBreakStore(timer.student_id);
  };

  const handleExtend = async () => {
    if (extended) return;
    try {
      await respondToGesture({ gesture_id: 'EXTEND-' + timer.student_id, decision: 'approve' });
    } catch (e) {}
    setExtended(true);
    // Ideally update end_time in store, but mock simplify for now
  };

  let color = 'var(--green)';
  if (remainingMs <= 180000) color = 'var(--amber)'; // <= 3 mins
  if (remainingMs <= 60000 || isExpired) color = 'var(--red)'; // <= 1 min

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isExpired ? 'var(--red)' : isPulse ? 'var(--red)' : 'var(--border)'}`,
      borderRadius: 8,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: isPulse ? 'pulse-red 2s infinite' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {timer.student_name}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Toilet break
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500,
          color: isExpired ? 'var(--red)' : 'var(--text-primary)',
          letterSpacing: 2
        }}>
          {isExpired ? '00:00' : `${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`}
        </div>
      </div>

      <div style={{ height: 4, width: '100%', background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: color, transition: 'width 1s linear, background-color 1s ease' }} />
      </div>

      {isExpired ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', alignSelf: 'center', minHeight: 24, display: 'flex', alignItems: 'center' }}>
          AWAITING LOCK...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--amber)' }}
            onClick={handleExtend}
            disabled={extended}
          >
            {extended ? 'EXTENDED (Used)' : 'EXTEND 5 MIN'}
          </button>
          <button
            className="btn"
            style={{ flex: 1, justifyContent: 'center', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
            onClick={handleReturn}
          >
            MARKED RETURNED
          </button>
        </div>
      )}
    </div>
  );
}

export function BreakTimerList() {
  const breaks = useAttendanceStore((s) => s.breaks);
  if (breaks.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="section-label">ACTIVE BREAKS</span>
        <span style={{
          background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          {breaks.length}
        </span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 240, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {breaks.map(b => <BreakTimerCard key={b.student_id} timer={b} />)}
      </div>
    </div>
  );
}
