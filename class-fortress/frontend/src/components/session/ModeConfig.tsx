import { useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
      style={{ transition: 'transform 220ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function NumberStepper({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '3px 8px', borderRadius: 0, fontWeight: 700, fontSize: 14 }}
          onClick={() => onChange(Math.max(min, value - 1))}
        >−</button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', padding: '3px 10px', minWidth: 32, textAlign: 'center' }}>
          {value}
        </span>
        <button
          className="btn btn-ghost"
          style={{ padding: '3px 8px', borderRadius: 0, fontWeight: 700, fontSize: 14 }}
          onClick={() => onChange(Math.min(max, value + 1))}
        >+</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
          background: value ? 'var(--accent)' : 'var(--bg-base)',
          border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
          position: 'relative', transition: 'all 200ms ease',
          boxShadow: value ? '0 0 8px var(--accent-glow)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, height: 14, width: 14, borderRadius: '50%',
          background: '#fff',
          left: value ? 18 : 2,
          transition: 'left 200ms cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}

function SegmentControl({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: 2, gap: 2 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1, padding: '4px 6px', borderRadius: 4,
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: value === opt ? 'var(--amber)' : 'transparent',
              color: value === opt ? '#000' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              transition: 'all 180ms ease',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModeConfig() {
  const [open, setOpen] = useState(true);
  const mode = useSessionStore((s) => s.mode);
  const config = useSessionStore((s) => s.config);
  const updateConfig = useSessionStore((s) => s.updateConfig);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', height: 40,
        }}
      >
        <span className="section-label">Config</span>
        <ChevronIcon open={open} />
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-in 200ms ease' }}>
          {/* Common */}
          <NumberStepper
            label="Break timer (min)"
            value={config.breakDurationMin}
            min={5} max={30}
            onChange={(v) => updateConfig({ breakDurationMin: v })}
          />

          {mode === 'class' ? (
            <>
              <Toggle
                label="Auto-lock after return"
                value={config.autoLockAfterReturn}
                onChange={(v) => updateConfig({ autoLockAfterReturn: v })}
              />
              <Toggle
                label="Gesture detection"
                value={config.gestureDetection}
                onChange={(v) => updateConfig({ gestureDetection: v })}
              />
            </>
          ) : (
            <>
              <NumberStepper
                label="Phone tolerance (±)"
                value={config.phoneTolerance}
                min={0} max={5}
                onChange={(v) => updateConfig({ phoneTolerance: v })}
              />
              <SegmentControl
                label="Motion sensitivity"
                options={['low', 'medium', 'high']}
                value={config.motionSensitivity}
                onChange={(v) => updateConfig({ motionSensitivity: v as 'low' | 'medium' | 'high' })}
              />
              <Toggle
                label="Alert sound"
                value={config.alertSound}
                onChange={(v) => updateConfig({ alertSound: v })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
