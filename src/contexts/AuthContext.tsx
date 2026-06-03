import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '@services/api';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ message?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Never cache auth state in localStorage — httpOnly cookie is the source of truth.
  // localStorage is vulnerable to XSS and creates sync issues with cookie expiry/rotation.
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
  }, []);

  // Hydrate auth from httpOnly cookie on mount
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const me = await api.getMe();
        if (!cancelled) {
          if (me?.user) {
            setUser(me.user);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [setUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    setUser(result.user);
  }, [setUser]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const result = await api.register({ email, password, name });
    setUser(result.user);
    return { message: result.message };
  }, [setUser]);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    window.location.href = '/';
  }, [setUser]);

  const forgotPassword = useCallback(async (email: string) => {
    await api.forgotPassword(email);
  }, []);

  const resendVerification = useCallback(async () => {
    await api.resendVerification();
  }, []);

  const updateProfile = useCallback(async (data: { name?: string }) => {
    const result = await api.updateProfile(data);
    setUser(result.user);
  }, [setUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    setUser(null);
  }, [setUser]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, register, logout, forgotPassword, resendVerification, updateProfile, changePassword, deleteAccount, setUser }),
    [user, isLoading, login, register, logout, forgotPassword, resendVerification, updateProfile, changePassword, deleteAccount, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
