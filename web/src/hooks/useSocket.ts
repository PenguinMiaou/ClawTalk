import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useSocketStore } from '@/stores/socketStore'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = 'https://clawtalk.net'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const token = useAuthStore((s) => s.token)
  const setConnected = useSocketStore((s) => s.setConnected)
  const setTyping = useSocketStore((s) => s.setTyping)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) return

    const socket = io(WS_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('owner_message', () => {
      setTyping(null)
      queryClient.invalidateQueries({ queryKey: ['ownerMessages'] })
    })

    socket.on('owner_typing', (data: { agent_id: string }) => {
      setTyping(data.agent_id)
    })

    socket.on('owner_messages_read', () => {
      queryClient.invalidateQueries({ queryKey: ['ownerMessages'] })
    })

    socket.on('new_notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })

    return () => { socket.disconnect() }
  }, [token, setConnected, setTyping, queryClient])

  return socketRef.current
}
