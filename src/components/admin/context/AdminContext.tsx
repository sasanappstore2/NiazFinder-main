'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import type { AdminPermissionId } from '@/config/admin-permissions';

export type AdminMe = {
  user: {
    id: string;
    phone: string;
    email: string | null;
    role: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  permissions: string[];
  isOwner: boolean;
};

type AdminContextValue = {
  me: AdminMe | null;
  isLoading: boolean;
  hasPermission: (permission: AdminPermissionId | AdminPermissionId[]) => boolean;
  apiFetch: <T>(url: string, init?: RequestInit) => Promise<T>;
  refreshMe: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const authToken = useAppStore((s) => s.authToken);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...((init?.headers as Record<string, string> | undefined) || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'عملیات انجام نشد');
      return data as T;
    },
    [authToken]
  );

  const refreshMe = useCallback(async () => {
    if (!authToken) {
      setMe(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiFetch<AdminMe>('/api/super-admin/me');
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, authToken]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const hasPermission = useCallback(
    (permission: AdminPermissionId | AdminPermissionId[]) => {
      if (!me) return false;
      if (me.isOwner || me.permissions.includes('*')) return true;
      const list = Array.isArray(permission) ? permission : [permission];
      return list.some((p) => me.permissions.includes(p));
    },
    [me]
  );

  const value = useMemo(
    () => ({ me, isLoading, hasPermission, apiFetch, refreshMe }),
    [me, isLoading, hasPermission, apiFetch, refreshMe]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

export function useAdminOptional() {
  return useContext(AdminContext);
}
