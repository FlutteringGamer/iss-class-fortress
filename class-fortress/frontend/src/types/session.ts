export type SessionMode = 'class' | 'exam';
export type SessionStatus = 'idle' | 'active' | 'ended';

export interface Session {
  session_id: string;
  mode: SessionMode;
  course_id: string;
  started_at: string;   // ISO
  ended_at?: string;    // ISO
  solenoid_state: 'locked' | 'unlocked';
}

export interface SessionStartRequest {
  mode: SessionMode;
  course_id: string;
}

export interface SessionEndRequest {
  session_id: string;
}

export interface SessionStartResponse {
  session_id: string;
  mode: SessionMode;
  course_id: string;
  started_at: string;
  solenoid_state: 'locked' | 'unlocked';
  message: string;
}

export interface SessionEndResponse {
  session_id: string;
  ended_at: string;
  present_count: number;
  absent_count: number;
  message: string;
}

export interface SessionReport {
  session_id: string;
  course_id: string;
  mode: SessionMode;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  present_count: number;
  absent_count: number;
  break_requests: number;
  gesture_events: number;
}
