import { create } from 'zustand';
import type { HardwareStatus, SolenoidState } from '../types/hardware';

interface HardwareStore {
  // State
  hardwareStatus: HardwareStatus | null;
  solenoidState: SolenoidState;
  solenoidAnimating: boolean;
  isLoading: boolean;

  // Actions (spec-required names)
  setSolenoidState: (state: SolenoidState) => void;
  updateStatus: (status: HardwareStatus) => void;

  // UI helpers
  triggerSolenoidAnimation: () => void;
  setLoading: (v: boolean) => void;
}

export const useHardwareStore = create<HardwareStore>((set) => ({
  hardwareStatus: null,
  solenoidState: 'locked',
  solenoidAnimating: false,
  isLoading: true,

  setSolenoidState: (state) => set({ solenoidState: state }),

  updateStatus: (status) =>
    set({
      hardwareStatus: status,
      solenoidState: status.solenoid_state,
      isLoading: false,
    }),

  triggerSolenoidAnimation: () => {
    set({ solenoidAnimating: true });
    setTimeout(() => set({ solenoidAnimating: false }), 400);
  },

  setLoading: (v) => set({ isLoading: v }),
}));
