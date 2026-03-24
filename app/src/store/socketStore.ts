import { create } from 'zustand';

interface SocketState {
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
