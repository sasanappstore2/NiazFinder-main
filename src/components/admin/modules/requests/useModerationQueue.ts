'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';

export type ModerationQueueItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  moderationStatus: string;
  city: string | null;
  province: string | null;
  createdAt: string;
  rejectionReason: string | null;
  assignedToUserId: string | null;
  user: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
  category: { id: string; name: string; slug: string } | null;
  subcategory: { id: string; name: string; slug: string } | null;
  assignedTo: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  proposalCount: number;
};

export type ModerationDetail = ModerationQueueItem & {
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  priority: string;
  tags: string[];
  attachmentUrls: string[];
  dynamicAnswers: Record<string, unknown>;
  aiExtractedData: Record<string, unknown>;
  moderationNotes: string | null;
  intentType: string | null;
  source: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; displayName: string | null; firstName: string | null; lastName: string | null } | null;
};

export type ModerationStats = {
  pending: number;
  reviewedToday: number;
  myReviewedToday: number;
};

export type ModerationAction = 'approve' | 'reject_soft' | 'reject_final';

export function useModerationQueue() {
  const { apiFetch, hasPermission } = useAdmin();
  const canModerate = hasPermission('market:requests:moderate');

  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModerationDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch<ModerationStats>('/api/super-admin/requests/moderation-stats');
      setStats(res);
    } catch {
      /* ignore */
    }
  }, [apiFetch]);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        moderationStatus: 'PENDING',
        limit: '50',
      });
      const res = await apiFetch<{
        requests: ModerationQueueItem[];
        pagination: { nextCursor: string | null };
      }>(`/api/super-admin/requests?${params}`);
      setItems(res.requests);
      setNextCursor(res.pagination.nextCursor);
      setSelectedId((prev) => prev ?? res.requests[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری صف');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  const loadDetail = useCallback(
    async (id: string) => {
      setIsDetailLoading(true);
      try {
        const res = await apiFetch<{ request: ModerationDetail }>(`/api/super-admin/requests/${id}`);
        setDetail(res.request);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در جزئیات');
        setDetail(null);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    void loadQueue();
    void loadStats();
  }, [loadQueue, loadStats]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const handler = () => {
      void loadQueue();
      void loadStats();
    };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [loadQueue, loadStats]);

  const moderateOne = useCallback(
    async (id: string, action: ModerationAction, reason?: string) => {
      if (!canModerate) return false;
      try {
        await apiFetch(`/api/super-admin/requests/${id}/moderate`, {
          method: 'POST',
          body: JSON.stringify({ action, reason }),
        });
        setItems((prev) => prev.filter((x) => x.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        const idx = items.findIndex((x) => x.id === id);
        const nextItem = items[idx + 1] ?? items[idx - 1] ?? null;
        setSelectedId(nextItem?.id ?? null);
        void loadStats();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا');
        return false;
      }
    },
    [apiFetch, canModerate, items, loadStats]
  );

  const moderateBulk = useCallback(
    async (ids: string[], action: ModerationAction, reason?: string) => {
      if (!canModerate || ids.length === 0) return false;
      try {
        const res = await apiFetch<{ successCount: number; message: string }>(
          '/api/super-admin/requests/moderate/bulk',
          { method: 'POST', body: JSON.stringify({ ids, action, reason }) }
        );
        toast.success(res.message);
        setSelectedIds(new Set());
        await loadQueue();
        await loadStats();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا');
        return false;
      }
    },
    [apiFetch, canModerate, loadQueue, loadStats]
  );

  const claim = useCallback(
    async (id: string) => {
      if (!canModerate) return;
      try {
        await apiFetch(`/api/super-admin/requests/${id}/claim`, { method: 'POST' });
        toast.success('اختصاص داده شد');
        await loadQueue();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا');
      }
    },
    [apiFetch, canModerate, loadQueue]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(items.map((x) => x.id)));
  const clearSelection = () => setSelectedIds(new Set());

  return {
    items,
    stats,
    detail,
    selectedId,
    setSelectedId,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isLoading,
    isDetailLoading,
    canModerate,
    moderateOne,
    moderateBulk,
    claim,
    reload: loadQueue,
    nextCursor,
  };
}
