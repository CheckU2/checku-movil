import React, { createContext, useContext, useEffect, useState } from 'react';
import { request, clearTokens, saveTokens } from '../api/client';
import type { ApiEnvelope, LoginData, User } from '../types/models';

type AuthState = {
  user: User | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    request<ApiEnvelope<User>>('/auth/me')
      .then(result => { if (active) setUser(result.data); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await request<ApiEnvelope<LoginData>>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: email.trim(), password }),
    }, false);
    await saveTokens(result.data);
    setUser(result.data.user);
  };
  const signOut = async () => {
    await clearTokens(); setUser(null);
  };
  return <Context.Provider value={{ user, loading, signIn, signOut }}>{children}</Context.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(Context);
  if (!context) throw new Error('useAuth requiere AuthProvider');
  return context;
}
