'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import type { AdminPermissionId } from '@/config/admin-permissions';
import { permissionSatisfied } from '@/lib/rbac/permission-check';
import { formatApiError } from '@/lib/api/format-api-error';

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
  /** fetch with Bearer — for binary routes (frame.jpeg) */
  authorizedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  refreshMe: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const authToken = useAppStore((s) => s.authToken);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authorizedFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      return fetch(url, {
        ...init,
        cache: init?.cache ?? 'no-store',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...((init?.headers as Record<string, string> | undefined) || {}),
        },
      });
    },
    [authToken]
  );

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await authorizedFetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...((init?.headers as Record<string, string> | undefined) || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = formatApiError(data);
        if (res.status === 401) {
          throw new Error(err === 'Unauthorized' ? 'لطفاً دوباره وارد شوید (نشست منقضی شده)' : err);
        }
        throw new Error(err);
      }
      return data as T;
    },
    [authorizedFetch]
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
      return list.some((p) => permissionSatisfied(me.permissions, p));
    },
    [me]
  );

  const value = useMemo(
    () => ({ me, isLoading, hasPermission, apiFetch, authorizedFetch, refreshMe }),
    [me, isLoading, hasPermission, apiFetch, authorizedFetch, refreshMe]
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
