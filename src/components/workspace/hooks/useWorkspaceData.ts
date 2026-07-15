'use client';

import { useCallback, useEffect, useState } from 'react';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import type { WorkspaceData } from '../types';

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

type WorkspaceApiResponse = WorkspaceData & { adminPreview?: boolean };

async function fetchJson<T>(
  url: string,
  signal?: AbortSignal
): Promise<{ data: T | null; error?: string }> {
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

export function useWorkspaceData(
  userId: string | undefined,
  enabled: boolean,
  adminPreview = false
) {
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const workspaceUrl = adminPreview
    ? '/api/business/me/workspace?adminPreview=1'
    : '/api/business/me/workspace';

  const load = useCallback(async () => {
    if (!enabled) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    if (!adminPreview && !userId) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await fetchJson<WorkspaceApiResponse>(workspaceUrl);
    if (!result.data) {
      const message = result.error ?? 'بارگذاری میزکار ناموفق بود';
      setData({
        ...EMPTY,
        errors: { needs: message, files: message, collaborations: message },
      });
    } else {
      const { adminPreview: _preview, ...workspace } = result.data;
      setData(workspace);
    }
    setLoading(false);
  }, [adminPreview, enabled, userId, workspaceUrl]);

  const refreshSilent = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || (!adminPreview && !userId)) return;
      const result = await fetchJson<WorkspaceApiResponse>(workspaceUrl, signal);
      if (!result.data) return;
      const { adminPreview: _preview, ...workspace } = result.data;
      setData(workspace);
    },
    [adminPreview, enabled, userId, workspaceUrl]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load, refreshSilent };
}
