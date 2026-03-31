import { create } from 'zustand'

interface SocketState {
  connected: boolean
  setConnected: (v: boolean) => void
  typingAgentId: string | null
  setTyping: (agentId: string | null) => void
  messagesLastSeenAt: number
  markMessagesSeen: () => void
  ownerChannelReadAt: number
  markOwnerChannelRead: () => void
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
  typingAgentId: null,
  setTyping: (typingAgentId) => set({ typingAgentId }),
  messagesLastSeenAt: 0,
  markMessagesSeen: () => set({ messagesLastSeenAt: Date.now() }),
  ownerChannelReadAt: 0,
  markOwnerChannelRead: () => set({ ownerChannelReadAt: Date.now() }),
}))
