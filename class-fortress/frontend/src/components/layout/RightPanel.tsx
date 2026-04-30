import React from 'react';
import { BreakTimerList } from '../attendance/BreakTimer';
import { RosterCard } from '../attendance/RosterCard';

export function RightPanel() {
  return (
    <aside className="app-panel right-panel">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
        <BreakTimerList />
        <RosterCard />
      </div>
    </aside>
  );
}
