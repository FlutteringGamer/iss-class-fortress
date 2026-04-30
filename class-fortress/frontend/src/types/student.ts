export type AttendanceStatus = 'present' | 'absent' | 'break';

export interface Student {
  id: string;
  name: string;
  student_number: string;
  course_id: string;
  photo_url?: string;
  status: AttendanceStatus;
}

export interface BreakTimer {
  student_id: string;
  student_name: string;
  started_at: string;        // ISO
  ends_at: string;           // ISO
  duration_minutes: number;
}
