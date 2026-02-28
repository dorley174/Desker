import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@/domain/types';
import { authApi, type AuthSession, type ChangePasswordInput, type LoginInput, type RegisterInput, type UpdateProfileInput } from '@/api/authApi';

const SESSION_KEY = 'desker_session_v1';

type AuthContextValue = {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;

  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;

  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function writeSessionToken(token: string | null) {
  if (!token) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => readSessionToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function init() {
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await authApi.getMe(sessionToken);
        if (!alive) return;
        setUser(me);
      } catch {
        // Session invalid/expired
        writeSessionToken(null);
        if (!alive) return;
        setSessionToken(null);
        setUser(null);
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, [sessionToken]);

  async function applySession(session: AuthSession) {
    writeSessionToken(session.sessionToken);
    setSessionToken(session.sessionToken);
    setUser(session.user);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionToken,
      isLoading,

      async login(input) {
        const session = await authApi.login(input);
        await applySession(session);
      },

      async register(input) {
        const session = await authApi.register(input);
        await applySession(session);
      },

      logout() {
        writeSessionToken(null);
        setSessionToken(null);
        setUser(null);
      },

      async updateProfile(input) {
        if (!sessionToken) throw new Error('Not authenticated');
        const updated = await authApi.updateProfile(sessionToken, input);
        setUser(updated);
      },

      async changePassword(input) {
        if (!sessionToken) throw new Error('Not authenticated');
        await authApi.changePassword(sessionToken, input);
      },
    }),
    [user, sessionToken, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
