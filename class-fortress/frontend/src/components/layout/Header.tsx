import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../../store/useSessionStore';
import type { SessionMode } from '../../types/session';

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', letterSpacing: 1 }}>
      {hh}:{mm}:{ss}
    </span>
  );
}

function SessionBadge() {
  const status = useSessionStore((s) => s.status);
  const mode = useSessionStore((s) => s.mode);

  if (status !== 'active') {
    return (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 1,
        color: 'var(--text-muted)',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        padding: '3px 10px', borderRadius: 20,
      }}>
        IDLE
      </span>
    );
  }

  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 1,
      color: 'var(--green)',
      background: 'rgba(34,197,94,0.1)',
      border: '1px solid rgba(34,197,94,0.3)',
      padding: '3px 10px', borderRadius: 20,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span className="status-dot connected pulse" style={{ width: 6, height: 6 }} />
      {mode.toUpperCase()} LIVE
    </span>
  );
}

function ModeToggle() {
  const mode = useSessionStore((s) => s.mode);
  const status = useSessionStore((s) => s.status);
  const setMode = useSessionStore((s) => s.setMode);
  const [tooltip, setTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSwitch = (next: SessionMode) => {
    if (next === mode) return;
    if (status === 'active') {
      setTooltip(true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setTooltip(false), 2500);
      return;
    }
    setMode(next);
  };

  useEffect(() => () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }, []);

  const isClass = mode === 'class';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Pill container */}
      <div style={{
        position: 'relative',
        display: 'flex',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 3,
        gap: 0,
      }}>
        {/* Sliding highlight */}
        <div style={{
          position: 'absolute',
          top: 3, bottom: 3,
          left: isClass ? 3 : 'calc(50% + 1px)',
          width: 'calc(50% - 4px)',
          borderRadius: 16,
          background: isClass
            ? 'linear-gradient(135deg, var(--accent), #7c3aed)'
            : 'linear-gradient(135deg, var(--amber), #d97706)',
          boxShadow: isClass
            ? '0 0 12px rgba(79,110,247,0.4)'
            : '0 0 12px rgba(245,158,11,0.35)',
          transition: 'left 220ms cubic-bezier(0.4,0,0.2,1), background 220ms ease, box-shadow 220ms ease',
          zIndex: 0,
        }} />

        {(['class', 'exam'] as SessionMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleSwitch(m)}
            style={{
              position: 'relative', zIndex: 1,
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: 0.8, textTransform: 'uppercase',
              padding: '5px 18px', borderRadius: 16,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: mode === m ? '#fff' : 'var(--text-muted)',
              transition: 'color 200ms ease',
            }}
          >
            {m === 'class' ? 'CLASS' : 'EXAM'}
          </button>
        ))}
      </div>

      {/* Warning tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)',
          background: 'var(--bg-elevated)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 6, padding: '6px 12px', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 100, animation: 'slide-in-top 150ms ease-out',
        }}>
          ⚠ Switching mode will reload gesture detection
        </div>
      )}
    </div>
  );
}

export function Header() {
  return (
    <header className="app-header" style={{ position: 'relative', zIndex: 50 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px var(--accent-glow)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 17, letterSpacing: 3, textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CLASS</span>
          <span style={{ color: 'var(--accent)' }}>FORTRESS</span>
        </span>
      </div>

      {/* Center — mode toggle */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <ModeToggle />
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <LiveClock />
        <SessionBadge />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent)22, var(--bg-elevated))',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--accent)',
          }}>
            P
          </div>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
            Prof. System
          </span>
        </div>
      </div>
    </header>
  );
}
