/**
 * Socket.io Client Hook
 * 
 * React hook for managing WebSocket connection
 * Handles connection lifecycle and provides socket instance
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: options.autoConnect !== false,
      reconnection: options.reconnection !== false,
      reconnectionDelay: options.reconnectionDelay || 1000,
      reconnectionAttempts: options.reconnectionAttempts || 5
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnecting(false);
    });

    socketInstance.on('reconnect_attempt', () => {
      console.log('🔄 Socket reconnecting...');
      setIsConnecting(true);
    });

    socketInstance.on('reconnect', () => {
      console.log('✅ Socket reconnected');
      setIsConnected(true);
      setIsConnecting(false);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { socket, isConnected, isConnecting };
}
