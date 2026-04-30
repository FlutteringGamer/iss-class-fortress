import { create } from 'zustand';
import type { Student, AttendanceStatus, BreakTimer } from '../types/student';
import type { EventMessage, PendingGesture } from '../types/event';
import { addMinutes } from 'date-fns';

interface AttendanceStore {
  students: Student[];
  breaks: BreakTimer[];
  events: EventMessage[];
  pendingGestures: PendingGesture[];
  gesturesHandled: number;

  markPresent: (studentId: string) => void;
  markAbsent: (studentId: string) => void;
  startBreak: (studentId: string, studentName: string, durationMinutes?: number) => void;
  endBreak: (studentId: string) => void;
  updateTimers: () => void;

  setStudents: (students: Student[]) => void;
  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void;
  addEvent: (event: EventMessage) => void;
  clearEvents: () => void;
  addPendingGesture: (gesture: PendingGesture) => void;
  removePendingGesture: (gestureId: string) => void;
  incrementGesturesHandled: () => void;
  clearAll: () => void;
}

export const useAttendanceStore = create<AttendanceStore>((set, get) => ({
  students: [
    { id: 'STU001', name: 'Ahmed Belhaj', course_id: 'CS280', student_number: '1001', status: 'pending' },
    { id: 'STU002', name: 'Mariem Chatti', course_id: 'CS280', student_number: '1002', status: 'pending' },
    { id: 'STU003', name: 'Youssef Mansouri', course_id: 'CS280', student_number: '1003', status: 'pending' },
    { id: 'STU004', name: 'Fatma Ben Ali', course_id: 'CS280', student_number: '1004', status: 'pending' },
    { id: 'STU005', name: 'Khaled Trabelsi', course_id: 'CS280', student_number: '1005', status: 'pending' },
    { id: 'STU006', name: 'Ines Hamdi', course_id: 'CS280', student_number: '1006', status: 'pending' },
    { id: 'STU007', name: 'Sami Bouazizi', course_id: 'CS280', student_number: '1007', status: 'pending' },
    { id: 'STU008', name: 'Rania Maaloul', course_id: 'CS280', student_number: '1008', status: 'pending' },
    { id: 'STU009', name: 'Omar Gharbi', course_id: 'CS280', student_number: '1009', status: 'pending' },
    { id: 'STU010', name: 'Nour Khemiri', course_id: 'CS280', student_number: '1010', status: 'pending' },
    { id: 'STU011', name: 'Ali Jellali', course_id: 'CS280', student_number: '1011', status: 'pending' },
    { id: 'STU012', name: 'Sarra Dhaouadi', course_id: 'CS280', student_number: '1012', status: 'pending' },
    { id: 'STU013', name: 'Walid Zidi', course_id: 'CS280', student_number: '1013', status: 'pending' },
    { id: 'STU014', name: 'Amira Khrouf', course_id: 'CS280', student_number: '1014', status: 'pending' },
    { id: 'STU015', name: 'Haithem Riahi', course_id: 'CS280', student_number: '1015', status: 'pending' },
    { id: 'STU016', name: 'Yasmine Letaief', course_id: 'CS280', student_number: '1016', status: 'pending' },
    { id: 'STU017', name: 'Tarek Zouari', course_id: 'CS280', student_number: '1017', status: 'pending' },
    { id: 'STU018', name: 'Salma Hachicha', course_id: 'CS280', student_number: '1018', status: 'pending' },
    { id: 'STU019', name: 'Mehdi Fourati', course_id: 'CS280', student_number: '1019', status: 'pending' },
    { id: 'STU020', name: 'Chaima Jarraya', course_id: 'CS280', student_number: '1020', status: 'pending' },
    { id: 'STU021', name: 'Anis Kallel', course_id: 'CS280', student_number: '1021', status: 'pending' },
    { id: 'STU022', name: 'Nadia Sahnoun', course_id: 'CS280', student_number: '1022', status: 'pending' },
    { id: 'STU023', name: 'Karim Frikha', course_id: 'CS280', student_number: '1023', status: 'pending' },
    { id: 'STU024', name: 'Asma Rekik', course_id: 'CS280', student_number: '1024', status: 'pending' },
  ],
  breaks: [],
  events: [],
  pendingGestures: [],
  gesturesHandled: 0,

  markPresent: (studentId) =>
    set((s) => ({ students: s.students.map((st) => st.id === studentId ? { ...st, status: 'present' } : st) })),

  markAbsent: (studentId) =>
    set((s) => ({ students: s.students.map((st) => st.id === studentId ? { ...st, status: 'absent' } : st) })),

  startBreak: (studentId, studentName, durationMinutes = 10) => {
    const now = new Date();
    const timer: BreakTimer = {
      student_id: studentId,
      student_name: studentName,
      started_at: now.toISOString(),
      ends_at: addMinutes(now, durationMinutes).toISOString(),
      duration_minutes: durationMinutes,
    };
    set((s) => ({
      breaks: [timer, ...s.breaks.filter((b) => b.student_id !== studentId)],
      students: s.students.map((st) => st.id === studentId ? { ...st, status: 'break' } : st),
    }));
  },

  endBreak: (studentId) =>
    set((s) => ({
      breaks: s.breaks.filter((b) => b.student_id !== studentId),
      students: s.students.map((st) => st.id === studentId ? { ...st, status: 'present' } : st),
    })),

  updateTimers: () => {
    const now = Date.now();
    const { breaks } = get();
    const expired = breaks.filter((b) => new Date(b.ends_at).getTime() <= now);
    if (expired.length === 0) return;
    set((s) => ({
      breaks: s.breaks.filter((b) => new Date(b.ends_at).getTime() > now),
      students: s.students.map((st) => {
        const wasOnBreak = expired.some((b) => b.student_id === st.id);
        return wasOnBreak ? { ...st, status: 'absent' } : st;
      }),
    }));
  },

  setStudents: (students) => set({ students }),

  updateStudentStatus: (studentId, status) =>
    set((s) => ({ students: s.students.map((st) => st.id === studentId ? { ...st, status } : st) })),

  addEvent: (event) => set((s) => ({ events: [event, ...s.events].slice(0, 200) })),

  clearEvents: () => set({ events: [] }),

  addPendingGesture: (gesture) =>
    set((s) => ({ pendingGestures: [gesture, ...s.pendingGestures] })),

  removePendingGesture: (gestureId) =>
    set((s) => ({ pendingGestures: s.pendingGestures.filter((g) => g.gesture_id !== gestureId) })),

  incrementGesturesHandled: () => set((s) => ({ gesturesHandled: s.gesturesHandled + 1 })),

  clearAll: () => set({ students: [], breaks: [], events: [], pendingGestures: [], gesturesHandled: 0 }),
}));
