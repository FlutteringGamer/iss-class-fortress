import React, { useState } from 'react';
import { CameraFeed } from '../cameras/CameraFeed';
import { FaceOverlay } from '../cameras/FaceOverlay';
import { MotionOverlay } from '../cameras/MotionOverlay';
import { EventLog } from '../events/EventLog';
import { PhoneCountAlert } from '../exam/PhoneCountAlert';
import { SuspicionAlert } from '../exam/SuspicionAlert';
import { useSessionStore } from '../../store/useSessionStore';
import { useHardwareStore } from '../../store/useHardwareStore';
import { useAttendanceStore } from '../../store/useAttendanceStore';

function CameraFeedsRow() {
  const hardwareStatus = useHardwareStore((s) => s.hardwareStatus);
  const status = useSessionStore((s) => s.status);
  
  // Compute dummy detections based on events
  const events = useAttendanceStore((s) => s.events);
  const faceEvents = events.filter(e => e.type === 'face_detected').slice(0, 5); // Just grab last 5 for visual
  const motionEvents = events.filter(e => e.type === 'motion_alert').slice(0, 3);

  const faceDetections = faceEvents.map(e => ({
    student_name: e.student_name || 'Unknown',
    x: e.payload?.bounding_box?.x || (100 + Math.random() * 400),
    y: e.payload?.bounding_box?.y || (50 + Math.random() * 300),
    w: e.payload?.bounding_box?.w || 80,
    h: e.payload?.bounding_box?.h || 80,
    status: 'present' as const
  }));

  const motionAlerts = motionEvents.map(e => ({
    x: 200 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    w: 120,
    h: 120,
    confidence: e.payload?.confidence || 0.85,
  }));

  const streamUrl = status === 'active' ? (hardwareStatus?.mock_mode ? 'mock://camera' : '/api/camera/stream') : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
      <CameraFeed 
        title="PI CAMERA V3"
        badgeText="● FACE RECOGNITION"
        stream={streamUrl}
        overlayComponent={<FaceOverlay detections={faceDetections} />}
      />
      <CameraFeed 
        title="XIAOMI CAM"
        badgeText="● GESTURE DETECTION"
        stream={streamUrl}
        overlayComponent={<MotionOverlay alerts={motionAlerts} />}
      />
    </div>
  );
}

function ExamAlerts() {
  const mode = useSessionStore((s) => s.mode);
  const events = useAttendanceStore((s) => s.events);
  const motionAlerts = events.filter((e) => e.type === 'motion_alert');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  if (mode !== 'exam') return null;

  const activeAlerts = motionAlerts.filter(a => !dismissedAlerts.has(a.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      <PhoneCountAlert />
      {activeAlerts.map(alert => (
        <SuspicionAlert key={alert.id} alert={alert} onDismiss={() => setDismissedAlerts(prev => new Set(prev).add(alert.id))} />
      ))}
    </div>
  );
}

export function CenterPanel() {
  return (
    <main className="app-panel" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 16, 
      overflowY: 'auto',
      padding: 16,
      borderRight: '1px solid var(--border)' 
    }}>
      <CameraFeedsRow />
      <ExamAlerts />
      <EventLog />
    </main>
  );
}
