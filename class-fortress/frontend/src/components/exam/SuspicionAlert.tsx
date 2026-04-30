import React from 'react';
import { format } from 'date-fns';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { useSessionStore } from '../../store/useSessionStore';

export function SuspicionAlert({ alert, onDismiss }: { alert: any, onDismiss: () => void }) {
  const updateStudentStatus = useAttendanceStore((s) => s.updateStudentStatus);
  const students = useAttendanceStore(s => s.students);
  const student = students.find(s => s.id === alert.student_id);
  const isFlagged = student?.status === 'flagged'; // Assuming flagged is a UI mode we want to represent visually
  
  const handleFlag = () => {
    // Send to backend (not fully implemented in backend yet, just updating local store)
    updateStudentStatus(alert.student_id, 'absent'); // Using absent or an extended status
    // For now we'll just dismiss it and let the user know they flagged
    onDismiss();
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${isFlagged ? 'var(--red)' : 'var(--border)'}`,
      borderLeft: `4px solid ${isFlagged ? 'var(--red)' : 'var(--amber)'}`,
      borderRadius: 8,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: 'slide-in-top 150ms ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {alert.student_name}
            </span>
            {isFlagged && (
              <span style={{ 
                fontFamily: 'var(--font-mono)', fontSize: 9, 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', 
                padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.3)'
              }}>
                ⚑ FLAGGED
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Seat region {alert.payload?.seat_id || 'Unknown'} · {format(new Date(alert.timestamp), 'HH:mm:ss')}
          </div>
        </div>
        <div style={{ 
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, 
          color: alert.payload?.confidence > 0.8 ? 'var(--red)' : 'var(--amber)' 
        }}>
          {Math.round((alert.payload?.confidence || 0) * 100)}% CONFIDENCE
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 4, width: '100%', background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: `${Math.round((alert.payload?.confidence || 0) * 100)}%`, 
          background: alert.payload?.confidence > 0.8 ? 'var(--red)' : 'linear-gradient(90deg, var(--green), var(--amber))'
        }} />
      </div>

      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)' }}>
        {alert.payload?.description || 'Suspicious behavior detected'}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={handleFlag}>
          FLAG STUDENT
        </button>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onDismiss}>
          DISMISS
        </button>
      </div>
    </div>
  );
}
