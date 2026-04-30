import React, { useState } from 'react';
import { EventEntry } from './EventEntry';
import { useAttendanceStore } from '../../store/useAttendanceStore';

type FilterTab = 'All' | 'Gestures' | 'Door' | 'Attendance' | 'Alerts';

export function EventLog() {
  const events = useAttendanceStore((s) => s.events);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  
  // Track mount time so we only animate newly inserted events
  const [mountTime] = useState(() => Date.now());

  const filteredEvents = events.filter(e => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Gestures') return e.type === 'gesture';
    if (activeTab === 'Door') return e.type === 'door_event';
    if (activeTab === 'Attendance') return e.type === 'attendance_update' || e.type === 'face_detected';
    if (activeTab === 'Alerts') return e.severity === 'warning' || e.severity === 'critical' || e.type === 'alert' || e.type === 'motion_alert';
    return true;
  });

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,Type,Severity,Student,Message\n"
      + events.map(e => `${e.timestamp},${e.type},${e.severity},${e.student_name || ''},${JSON.stringify(e.payload)}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `session_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 300, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
          <span className="section-label">EVENTS</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {(['All', 'Gestures', 'Door', 'Attendance', 'Alerts'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '0 0 4px 0', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 150ms ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={handleExport}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          EXPORT
        </button>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px' }}>
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <EventEntry 
              key={event.id} 
              event={event} 
              newlyInserted={new Date(event.timestamp).getTime() > mountTime}
            />
          ))
        ) : (
          <div style={{ 
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' 
          }}>
            Waiting for session events...
          </div>
        )}
      </div>
    </div>
  );
}
