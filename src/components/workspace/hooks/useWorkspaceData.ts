'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import type { WorkspaceSyncPayload } from '@/lib/business/workspace/load-workspace-sync';
import type { WorkspaceData } from '../types';
import {
  type BusinessMeResponse,
  mergeWorkspaceSyncPayload,
} from '../lib/merge-workspace-sync';

const EMPTY: WorkspaceData = {
  profile: null,
  isRealEstate: false,
  needs: [],
  files: [],
  regionalFeed: { regionLabel: null, hasServiceArea: false, feedStatus: 'unconfigured' },
  collaborations: [],
  collaborationHasServiceArea: false,
  followUps: [],
  errors: {},
  filterOptions: { cities: [], regions: [], propertyTypes: [], dealTypes: [] },
};

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<{ data: T | null; error?: string }> {
  try {
    const res = await fetch(url, { headers: getClientAuthHeaders(), signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: (body as { error?: string }).error ?? 'خطا در بارگذاری' };
    }
    return { data: (await res.json()) as T };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null };
    }
    return { data: null, error: 'خطا در ارتباط با سرور' };
  }
}

export function useWorkspaceData(userId: string | undefined, enabled: boolean) {
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<WorkspaceData['profile']>(null);

  const applySync = useCallback((sync: WorkspaceSyncPayload) => {
    const profile = profileRef.current;
    if (!profile) return;
    setData(mergeWorkspaceSyncPayload(profile, sync));
  }, []);

  const load = useCallback(async () => {
    if (!enabled || !userId) {
      profileRef.current = null;
      setData(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);

    const meResult = await fetchJson<BusinessMeResponse>('/api/business/me');

    if (!meResult.data || meResult.error) {
      profileRef.current = null;
      setData({ ...EMPTY, errors: { needs: meResult.error ?? 'پروفایل کسب‌وکار یافت نشد' } });
      setLoading(false);
      return;
    }

    const me = meResult.data;
    const occupationSlugs = me.occupationSlugs ?? [];
    const isRE = isRealEstateBusiness(occupationSlugs);

    const profile = {
      slug: me.slug,
      name: me.name,
      city: me.city,
      occupationSlugs,
      userId,
    };
    profileRef.current = profile;

    if (!isRE) {
      setData({ ...EMPTY, profile, isRealEstate: false });
      setLoading(false);
      return;
    }

    const syncResult = await fetchJson<WorkspaceSyncPayload>('/api/business/me/workspace-sync');
    if (!syncResult.data) {
      const message = syncResult.error ?? 'بارگذاری میزکار ناموفق بود';
      setData({
        ...EMPTY,
        profile,
        isRealEstate: true,
        errors: {
          needs: message,
          files: message,
          collaborations: message,
        },
      });
      setLoading(false);
      return;
    }

    try {
      setData(mergeWorkspaceSyncPayload(profile, syncResult.data));
    } catch {
      const message = 'خطا در پردازش داده‌های میزکار';
      setData({
        ...EMPTY,
        profile,
        isRealEstate: true,
        errors: {
          needs: message,
          files: message,
          collaborations: message,
        },
      });
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [enabled, userId]);

  const refreshSilent = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || !userId || !profileRef.current) return;

      const syncResult = await fetchJson<WorkspaceSyncPayload>(
        '/api/business/me/workspace-sync',
        signal
      );
      if (!syncResult.data) return;

      applySync(syncResult.data);
    },
    [applySync, enabled, userId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load, refreshSilent };
}
