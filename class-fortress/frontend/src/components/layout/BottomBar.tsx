import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { useHardwareStore } from '../../store/useHardwareStore';

function formatUptime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Animates scale 1→1.1→1 when value changes */
function AnimatedNum({ value, style }: { value: number | string; style?: React.CSSProperties }) {
  const [scale, setScale] = useState(1);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setScale(1.18);
      const t = setTimeout(() => setScale(1), 200);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span style={{
      display: 'inline-block',
      transform: `scale(${scale})`,
      transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
      ...style,
    }}>
      {value}
    </span>
  );
}

function Chip({
  label, children, divider = true,
}: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      paddingRight: divider ? 24 : 0,
      borderRight: divider ? '1px solid var(--border)' : 'none',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function BottomBar() {
  const status     = useSessionStore((s) => s.status);
  const mode       = useSessionStore((s) => s.mode);
  const uptime     = useSessionStore((s) => s.uptime);
  const hardwareStatus = useHardwareStore((s) => s.hardwareStatus);
  const students   = useAttendanceStore((s) => s.students);
  const breaks     = useAttendanceStore((s) => s.breaks);
  const gesturesHandled = useAttendanceStore((s) => s.gesturesHandled);

  const total       = students.length;
  const presentCount = students.filter((s) => s.status === 'present' || s.status === 'break').length;
  const absentCount  = students.filter((s) => s.status === 'absent').length;
  const breakCount   = breaks.length;

  const mockMode = hardwareStatus?.mock_mode ?? true;
  const netMs    = hardwareStatus?.network_ms;

  return (
    <footer className="app-footer">
      {/* Left: mode + mock badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1,
          padding: '2px 8px', borderRadius: 4,
          background: mockMode ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${mockMode ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: mockMode ? 'var(--amber)' : 'var(--green)',
        }}>
          {mockMode ? 'MOCK' : 'LIVE'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {mode}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
          borderLeft: '1px solid var(--border)', paddingLeft: 8,
        }}>
          {status === 'active' ? (
            <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="status-dot connected pulse" style={{ width: 5, height: 5 }} />
              LIVE
            </span>
          ) : 'SESSION IDLE'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ flex: 1 }} />

      {/* Metric chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Chip label="Present">
          <AnimatedNum value={presentCount} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--green)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>/ {total}</span>
        </Chip>

        <Chip label="Absent">
          <AnimatedNum value={absentCount} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--red)' }} />
        </Chip>

        <Chip label="On Break">
          <AnimatedNum value={breakCount} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--amber)' }} />
        </Chip>

        <Chip label="Gestures">
          <AnimatedNum value={gesturesHandled} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>handled</span>
        </Chip>

        <Chip label="Session" divider={false}>
          <AnimatedNum
            value={status === 'active' ? formatUptime(uptime) : '—'}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 1 }}
          />
        </Chip>
      </div>

      {/* Right: network ping */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 24 }}>
        <span className="status-dot connected" style={{ width: 5, height: 5 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          {netMs != null ? `NET ${netMs}ms` : 'NET —'}
        </span>
      </div>
    </footer>
  );
}
