import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket;

export function getSocket() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('goalsync_token');
  if (!token) return null;

  if (!socket || socket.disconnected) {
    socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
