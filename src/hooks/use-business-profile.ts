'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Business } from '@/contracts/business-profile';

export function useBusinessProfile(id: string | undefined) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'خطا در بارگذاری');
      }
      const json = await res.json();
      setBusiness(json.business);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته');
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { business, loading, error, reload };
}
