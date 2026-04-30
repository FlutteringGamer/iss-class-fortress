import { SessionControls } from '../session/SessionControls';
import { HardwareStatus } from '../session/HardwareStatus';
import { ModeConfig } from '../session/ModeConfig';

export function LeftPanel() {
  return (
    <aside className="app-panel left-panel">
      <SessionControls />
      <HardwareStatus />
      <ModeConfig />
    </aside>
  );
}
