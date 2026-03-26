import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useQueryClient } from '@tanstack/react-query';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const setConnected = useSocketStore((s) => s.setConnected);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = io('http://localhost:3000', { query: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('owner_message', () => {
      queryClient.invalidateQueries({ queryKey: ['ownerMessages'] });
    });

    socket.on('new_notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, setConnected, queryClient]);

  return socketRef.current;
}
