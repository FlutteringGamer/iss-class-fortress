import { useState, useCallback } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSessionStore } from '../../store/useSessionStore';

const COURSES = [
  { id: 'CS280', label: 'CS280 — AI Lab' },
  { id: 'MATH201', label: 'MATH201 — Diff Eq' },
  { id: 'IOT340', label: 'IOT340 — Embedded' },
  { id: 'CS401', label: 'CS401 — Algorithms' },
];

function formatUptime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function SessionControls() {
  const { status, startSession, endSession, isStarting, isEnding } = useSession();
  const courseId = useSessionStore((s) => s.courseId);
  const setCourseId = useSessionStore((s) => s.setCourseId);
  const uptime = useSessionStore((s) => s.uptime);
  const currentSession = useSessionStore((s) => s.currentSession);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const courseName = COURSES.find((c) => c.id === courseId)?.label ?? courseId;
  const isActive = status === 'active';

  const handleEnd = useCallback(() => {
    if (!confirmEnd) { setConfirmEnd(true); return; }
    setConfirmEnd(false);
    endSession();
  }, [confirmEnd, endSession]);

  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="section-label">Session</span>

      {/* ── IDLE ──────────────────────────────────────────────────────────── */}
      {!isActive && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isStarting}
              style={{ width: '100%' }}
            >
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <button
            id="start-session-btn"
            className="btn btn-start"
            onClick={() => startSession()}
            disabled={isStarting}
          >
            {isStarting ? <><Spinner /> INITIALIZING...</> : <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              START SESSION
            </>}
          </button>
        </>
      )}

      {/* ── ACTIVE ────────────────────────────────────────────────────────── */}
      {isActive && (
        <>
          {/* Course name */}
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {courseName}
          </div>

          {/* Timer */}
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 500,
            color: 'var(--text-primary)', letterSpacing: 2, textAlign: 'center',
            padding: '6px 0',
            textShadow: '0 0 20px rgba(79,110,247,0.3)',
          }}>
            {formatUptime(uptime)}
          </div>

          {/* Session ID snippet */}
          {currentSession && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
              {currentSession.session_id.slice(0, 8).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              id="door-override-btn"
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled
            >
              PAUSE
            </button>
            <button
              id="end-session-btn"
              className="btn btn-danger"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={isEnding ? undefined : handleEnd}
              disabled={isEnding}
            >
              {isEnding ? <><Spinner /> ENDING...</> : 'END SESSION'}
            </button>
          </div>

          {/* Inline confirmation */}
          {confirmEnd && !isEnding && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 10px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6, animation: 'fade-in 200ms ease',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', flex: 1 }}>
                End session?
              </span>
              <button className="btn btn-danger" style={{ padding: '3px 10px', fontSize: 10 }} onClick={handleEnd}>
                CONFIRM
              </button>
              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10 }} onClick={() => setConfirmEnd(false)}>
                CANCEL
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
