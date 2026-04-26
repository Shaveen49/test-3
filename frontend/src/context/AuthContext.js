// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage } from '../utils/storage';
import { authAPI } from '../services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on launch
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([Storage.getToken(), Storage.getUser()]);
        if (t && u) { setToken(t); setUser(u); }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  // Login  →  POST /api/auth/login
  const login = async (email, password) => {
    const { data } = await authAPI.login(email.trim(), password);
    await _persist(data);
    return data;
  };

  // Register  →  POST /api/auth/register
  const register = async (payload) => {
    const { data } = await authAPI.register(payload);
    await _persist(data);
    return data;
  };

  const _persist = async (data) => {
    const { token: t, ...u } = data;
    await Storage.save(t, u);
    setToken(t);
    setUser(u);
  };

  const logout = async () => {
    await Storage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{
      user, token, loading, login, register, logout,
      isDriver: user?.role === 'DRIVER',
      isUser:   user?.role === 'USER',
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
};
