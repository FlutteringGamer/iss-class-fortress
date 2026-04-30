import React from 'react';

interface MotionAlertBox {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

export function MotionOverlay({ alerts }: { alerts: MotionAlertBox[] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {alerts.map((al, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(al.x / 640) * 100}%`,
            top: `${(al.y / 480) * 100}%`,
            width: `${(al.w / 640) * 100}%`,
            height: `${(al.h / 480) * 100}%`,
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1.5px solid var(--red)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: 2,
          }}
        >
          <div style={{
            background: 'var(--red)',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '1px 4px',
            borderRadius: 2,
          }}>
            {Math.round(al.confidence * 100)}% conf
          </div>
        </div>
      ))}
    </div>
  );
}
