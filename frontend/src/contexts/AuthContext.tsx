import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { api, type User } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const didCheck = useRef(false);

  useEffect(() => {
    // Prevent StrictMode double-check
    if (didCheck.current) return;
    didCheck.current = true;

    api.users.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    try {
      const u = await api.users.me();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  const login = async (token: string, email: string) => {
    await api.auth.verify(token, email);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore logout errors
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
