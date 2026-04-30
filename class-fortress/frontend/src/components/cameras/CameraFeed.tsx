import React from 'react';

interface CameraFeedProps {
  title: string;
  badgeText: string;
  badgeColor?: string;
  stream: string | null;
  overlayComponent?: React.ReactNode;
}

export function CameraFeed({ title, badgeText, badgeColor = 'var(--green)', stream, overlayComponent }: CameraFeedProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </span>
      </div>
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        background: 'var(--bg-elevated)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border)'
      }}>
        {/* Badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 10,
          background: 'rgba(9, 12, 18, 0.7)', backdropFilter: 'blur(4px)',
          padding: '4px 8px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid var(--border)'
        }}>
          <span className="status-dot connected pulse" style={{ width: 6, height: 6, backgroundColor: badgeColor }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {badgeText}
          </span>
        </div>

        {/* Content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {stream === 'mock://camera' ? (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#1c2030', // mockup dark background
              position: 'relative'
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 18, color: 'var(--text-muted)', letterSpacing: 2 }}>
                MOCK FEED
              </span>
              <div className="scan-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
            </div>
          ) : stream ? (
            <img src={stream} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
              NO SIGNAL
            </span>
          )}
          {overlayComponent}
        </div>
      </div>
    </div>
  );
}
