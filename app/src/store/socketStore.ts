import { create } from 'zustand';

interface SocketState {
  connected: boolean;
  setConnected: (v: boolean) => void;
  typingAgentId: string | null;
  setTyping: (agentId: string | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
  typingAgentId: null,
  setTyping: (typingAgentId) => set({ typingAgentId }),
}));
