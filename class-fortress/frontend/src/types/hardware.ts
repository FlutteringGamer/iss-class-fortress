export type DeviceStatus = 'connected' | 'disconnected' | 'error' | 'unknown';
export type SolenoidState = 'locked' | 'unlocked';

export interface DeviceStatusInfo {
  status: DeviceStatus;
  last_seen?: string;   // ISO
  detail?: string;
}

export interface HardwareStatus {
  pi_camera: DeviceStatusInfo;
  xiaomi_camera: DeviceStatusInfo;
  solenoid: DeviceStatusInfo;
  solenoid_state: SolenoidState;
  network_ms: number;
  mock_mode: boolean;
}
