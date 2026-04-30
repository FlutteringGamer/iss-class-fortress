export type EventType =
  | 'face_detected'
  | 'gesture'
  | 'door_event'
  | 'attendance_update'
  | 'alert'
  | 'timer_update'
  | 'phone_count'
  | 'motion_alert'
  | 'session_event';

export type GestureType =
  | 'toilet_request'
  | 'question'
  | 'emergency'
  | 'submit_exam'
  | 'wave';

export type Severity = 'info' | 'warning' | 'critical';

export interface EventMessage {
  id: string;
  type: EventType;
  timestamp: string;          // ISO
  student_id?: string;
  student_name?: string;
  payload: Record<string, unknown>;
  severity: Severity;
  requires_action: boolean;
}

export interface PendingGesture {
  gesture_id: string;
  gesture_type: GestureType;
  student_id: string;
  student_name: string;
  detected_at: string;        // ISO
  confidence: number;         // 0–1
}
