'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/context/AdminContext';

export function useModerationStats() {
  const { apiFetch, hasPermission } = useAdmin();
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    if (!hasPermission('market:requests:read')) return;
    try {
      const res = await apiFetch<{ pending: number }>('/api/super-admin/requests/moderation-stats');
      setPending(res.pending);
    } catch {
      /* ignore */
    }
  }, [apiFetch, hasPermission]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  return { pending, reload: load };
}
