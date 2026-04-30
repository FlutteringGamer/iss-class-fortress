import React from 'react';

interface FaceDetection {
  student_name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  status: 'present' | 'unknown';
}

export function FaceOverlay({ detections }: { detections: FaceDetection[] }) {
  if (!detections || detections.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {detections.map((det, i) => {
        const color = det.status === 'present' ? 'var(--green)' : 'var(--amber)';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(det.x / 640) * 100}%`,
              top: `${(det.y / 480) * 100}%`,
              width: `${(det.w / 640) * 100}%`,
              height: `${(det.h / 480) * 100}%`,
            }}
          >
            {/* Brackets */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 10, height: 10, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
            
            {/* Name Label */}
            {det.student_name && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(17, 21, 32, 0.8)',
                backdropFilter: 'blur(4px)',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap'
              }}>
                {det.student_name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
