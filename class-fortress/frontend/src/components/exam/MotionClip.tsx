// MotionClip — displays a thumbnail + timestamp for a suspicious motion clip.
// In mock mode, no actual clip is stored; this renders a placeholder.
import type { EventMessage } from '../../types/event';
import { format } from 'date-fns';

export function MotionClip({ event }: { event: EventMessage }) {
  const p = event.payload as { clip_url?: string; description?: string };
  return (
    <div style={{
      display: 'flex', gap: 10, padding: 10,
      background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8,
    }}>
      {/* Clip thumbnail */}
      <div style={{
        width: 80, height: 54, borderRadius: 4, flexShrink: 0,
        background: '#060810', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {p.clip_url ? (
          <video src={p.clip_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>NO CLIP</span>
        )}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {event.student_name ?? 'Unknown'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>
          {p.description ?? 'Motion detected'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          {format(new Date(event.timestamp), 'HH:mm:ss')}
        </div>
      </div>
    </div>
  );
}
