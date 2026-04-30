import React, { useState } from 'react';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { StudentCard } from './StudentCard';

type FilterType = 'ALL' | 'PRESENT' | 'ABSENT' | 'BREAK' | 'PENDING';

export function RosterCard() {
  const students = useAttendanceStore((s) => s.students);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(s => {
    if (filter !== 'ALL' && s.status !== filter.toLowerCase()) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const order = { break: 0, absent: 1, present: 2, pending: 3, flagged: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const breakCount = students.filter(s => s.status === 'break').length;
  const pendingCount = students.filter(s => s.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        <span className="section-label">ATTENDANCE</span>
        
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            type="text" 
            placeholder="Search students..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '8px 12px 8px 32px', 
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13
            }} 
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['ALL', 'PRESENT', 'ABSENT', 'BREAK', 'PENDING'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${filter === f ? 'var(--border-active)' : 'var(--border)'}`,
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '4px 8px', borderRadius: 12,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 0.5, cursor: 'pointer', transition: 'all 150ms ease'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          {students.length} students &middot; {presentCount} present &middot; {absentCount} absent &middot; {breakCount} break &middot; {pendingCount} pending
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
        {filteredStudents.map(student => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}
