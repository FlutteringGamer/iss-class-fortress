import { useState } from 'react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { overrideDoor } from '../../api/client';
import type { DeviceStatus } from '../../types/hardware';

// ── SVG device icons ──────────────────────────────────────────────────────────

function CameraIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
function LockIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function WifiIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<DeviceStatus, string> = {
  connected:    'var(--green)',
  disconnected: 'var(--red)',
  error:        'var(--red)',
  unknown:      'var(--text-muted)',
};

const STATUS_LABEL: Record<DeviceStatus, string> = {
  connected:    'CONNECTED',
  disconnected: 'OFFLINE',
  error:        'ERROR',
  unknown:      'UNKNOWN',
};

function DeviceRow({
  icon, label, statusKey, statusText, isError, extra,
}: {
  icon: React.ReactNode;
  label: string;
  statusKey: DeviceStatus;
  statusText?: string;
  isError?: boolean;
  extra?: React.ReactNode;
}) {
  const color = STATUS_COLOR[statusKey];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      background: isError ? 'rgba(239,68,68,0.04)' : 'var(--bg-elevated)',
      borderRadius: 6,
      borderLeft: isError ? '2px solid var(--red)' : '2px solid transparent',
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color, letterSpacing: 0.3 }}>
          {statusText ?? STATUS_LABEL[statusKey]}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className={`status-dot ${statusKey === 'connected' ? 'connected' : statusKey === 'error' ? 'error' : 'unknown'}`}
          style={{ width: 6, height: 6 }} />
        {extra}
      </div>
    </div>
  );
}

// ── Override Modal ─────────────────────────────────────────────────────────────

function OverrideModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSolenoidState = useHardwareStore((s) => s.setSolenoidState);
  const triggerSolenoidAnimation = useHardwareStore((s) => s.triggerSolenoidAnimation);

  const handleAction = async (action: 'lock' | 'unlock') => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await overrideDoor(action, reason);
      setSolenoidState(action === 'lock' ? 'locked' : 'unlocked');
      triggerSolenoidAnimation();
      setResult(`Door ${action}ed successfully.`);
      setTimeout(onClose, 2000);
    } catch {
      setResult('Override failed — check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(9,12,18,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, width: 320,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'slide-in-top 150ms ease-out',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Manual Door Override
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>
          Reason is required and will be logged.
        </div>

        <input
          placeholder="Reason for override..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
          autoFocus
        />

        {result ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', textAlign: 'center', padding: 8 }}>
            ✓ {result}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => handleAction('lock')} disabled={loading || !reason.trim()}
            >
              <LockIcon color="currentColor" /> LOCK
            </button>
            <button
              className="btn btn-amber" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => handleAction('unlock')} disabled={loading || !reason.trim()}
            >
              UNLOCK
            </button>
          </div>
        )}

        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function HardwareStatus() {
  const hw = useHardwareStore((s) => s.hardwareStatus);
  const solenoidState = useHardwareStore((s) => s.solenoidState);
  const [showOverride, setShowOverride] = useState(false);

  const piStatus    = hw?.pi_camera.status    ?? 'unknown';
  const xiaomiStatus = hw?.xiaomi_camera.status ?? 'unknown';
  const solenoidStatus = hw?.solenoid.status  ?? 'unknown';

  return (
    <>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="section-label">Hardware</span>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
          <DeviceRow
            icon={<CameraIcon color={STATUS_COLOR[piStatus]} />}
            label="Pi Camera V3"
            statusKey={piStatus}
            isError={piStatus === 'error' || piStatus === 'disconnected'}
          />
          <DeviceRow
            icon={<CameraIcon color={STATUS_COLOR[xiaomiStatus]} />}
            label="Xiaomi Cam"
            statusKey={xiaomiStatus}
            statusText={xiaomiStatus === 'connected' ? 'STREAMING' : undefined}
            isError={xiaomiStatus === 'error' || xiaomiStatus === 'disconnected'}
          />
          <DeviceRow
            icon={<LockIcon color={solenoidState === 'locked' ? 'var(--green)' : 'var(--amber)'} />}
            label="Solenoid"
            statusKey={solenoidStatus}
            statusText={solenoidState === 'locked' ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}
            extra={
              <button
                onClick={() => setShowOverride(true)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
                  textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0,
                }}
              >
                OVERRIDE
              </button>
            }
          />
          <DeviceRow
            icon={<WifiIcon color="var(--accent)" />}
            label="Network"
            statusKey="connected"
            statusText={hw ? `${hw.network_ms}ms` : '—'}
          />
        </div>
      </div>
      {showOverride && <OverrideModal onClose={() => setShowOverride(false)} />}
    </>
  );
}
