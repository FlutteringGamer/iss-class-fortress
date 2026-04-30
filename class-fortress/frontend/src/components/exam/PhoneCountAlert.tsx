import React, { useState } from 'react';
import { useAttendanceStore } from '../../store/useAttendanceStore';

export function PhoneCountAlert() {
  const events = useAttendanceStore((s) => s.events);
  const phoneCounts = events.filter((e) => e.type === 'phone_count');
  const latestCount = phoneCounts.length > 0 ? phoneCounts[0] : null;

  const [dismissed, setDismissed] = useState(false);

  // If latest count matches or no counts yet, show default state
  if (!latestCount || latestCount.payload?.match) {
    return (
      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: 4,
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📱</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
          Phone count: {latestCount?.payload?.detected ?? 0} / {latestCount?.payload?.expected ?? 0} students — OK
        </span>
      </div>
    );
  }

  // Mismatch logic
  const detected = latestCount.payload?.detected || 0;
  const expected = latestCount.payload?.expected || 0;
  const diff = Math.abs(detected - expected);

  if (dismissed) {
    return (
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 4,
        padding: '6px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📱</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
            Phone mismatch detected ({diff} diff)
          </span>
        </div>
        <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => setDismissed(false)}>
          VIEW
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid var(--red)',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'slide-in-top 150ms ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ 
          background: 'var(--red)', width: 24, height: 24, borderRadius: 12, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' 
        }}>!</div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Phone Count Mismatch
        </span>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
        Detected: <b style={{ color: 'var(--red)' }}>{detected}</b> | 
        Expected: <b>{expected}</b> | 
        Difference: <b style={{ color: 'var(--amber)' }}>{diff}</b>
        <br/>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Verify the exam room immediately.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          ID: {latestCount.id.split('-')[0]}
        </span>
        <button className="btn" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => setDismissed(true)}>
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  );
}
