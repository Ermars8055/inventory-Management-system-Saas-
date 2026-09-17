import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'org_admin' | 'manager' | 'staff' | 'viewer';
  organizationId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
}

// ─── Permission table (mirrors backend rbac.py) ────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  org_admin: ['*'],
  manager: [
    'inventory:read', 'inventory:create', 'inventory:update',
    'assignments:read', 'assignments:create', 'assignments:update',
    'recipients:read', 'recipients:create', 'recipients:update',
    'suppliers:read', 'suppliers:create', 'suppliers:update',
    'reports:read', 'transactions:read',
    'settings:read',
    'users:read',
  ],
  staff: [
    'inventory:read',
    'assignments:read', 'assignments:create', 'assignments:update',
    'recipients:read',
    'transactions:read',
  ],
  viewer: [
    'inventory:read',
    'assignments:read',
    'recipients:read',
    'suppliers:read',
    'reports:read',
    'transactions:read',
  ],
};

function checkPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from stored token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password });
    localStorage.setItem('token', res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const can = useCallback((permission: string) => {
    if (!user) return false;
    return checkPermission(user.role, permission);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
