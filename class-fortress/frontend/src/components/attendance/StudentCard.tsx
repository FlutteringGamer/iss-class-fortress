import React, { useState } from 'react';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import type { Student } from '../../types/student';

// Use same formatting matching EventEntry to keep the time compact
export function StudentCard({ student }: { student: Student }) {
  const [expanded, setExpanded] = useState(false);
  const markPresent = useAttendanceStore((s) => s.markPresent);
  const markAbsent = useAttendanceStore((s) => s.markAbsent);

  // Avatar initials
  const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const getBadgeStyle = (status: Student['status']) => {
    switch (status) {
      case 'present': return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)', border: 'rgba(34, 197, 94, 0.2)', text: '● PRESENT' };
      case 'absent': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', border: 'transparent', text: '✕ ABSENT' };
      case 'break': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)', border: 'transparent', text: '◌ BREAK' }; // Animated text handled below
      case 'pending': return { bg: 'rgba(136, 145, 168, 0.1)', color: 'var(--text-muted)', border: 'transparent', text: '– PENDING' };
      default: return { bg: 'transparent', color: 'var(--text-muted)', border: 'transparent', text: 'UNKNOWN' };
    }
  };

  const badge = getBadgeStyle(student.status);

  return (
    <div 
      className="card" 
      style={{ 
        padding: '10px 12px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: expanded ? 12 : 0, 
        cursor: 'pointer',
        transition: 'all 200ms ease',
        background: expanded ? 'var(--bg-elevated)' : 'var(--bg-surface)'
      }}
      onClick={(e) => {
        // Prevent toggling when clicking buttons
        if ((e.target as HTMLElement).closest('button')) return;
        setExpanded(!expanded);
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 28, height: 28, borderRadius: 14, 
          background: 'var(--bg-base)', 
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, border: '1px solid var(--border)'
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {student.name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            STU{student.id.substring(0, 3)}
          </span>
        </div>
        <div style={{
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          padding: '2px 8px',
          borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          {badge.text}
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-in 200ms ease' }}>
          <div style={{ height: 1, background: 'var(--border)', width: '100%' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
             Details would appear here.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => markPresent(student.id)}>
              MARK PRESENT
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={() => markAbsent(student.id)}>
              MARK ABSENT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
