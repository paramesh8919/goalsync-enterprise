import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { getSocket, disconnectSocket } from '../lib/socket';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('goalsync_user') : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('goalsync_token') : null;
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  // Establish realtime connection once a user is authenticated
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    socket.on('notification:new', (n) => {
      toast(n.message, { icon: '🔔' });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [user]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('goalsync_token', res.data.token);
    localStorage.setItem('goalsync_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // Employee / Team Leader self-registration never logs the user in — the account
  // stays inactive until both a Manager and the Admin approve it. Manager / Admin
  // self-registration is activated instantly, so the backend returns a token and
  // we log them straight in.
  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data.token) {
      localStorage.setItem('goalsync_token', res.data.token);
      localStorage.setItem('goalsync_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('goalsync_token');
    localStorage.removeItem('goalsync_user');
    disconnectSocket();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
