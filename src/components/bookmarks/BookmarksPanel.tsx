'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from '@/hooks/navigation/use-navigate';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { mapBookmarkApiToNeedItem } from '@/lib/bookmarks/map-request';
import type { BookmarkNeedItem, BookmarkInboxFilter } from '@/lib/bookmarks/types';
import {
  countNeedsFollowUp,
  filterBookmarkRows,
  sortBookmarkRows,
} from '@/lib/bookmarks/types';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { BookmarksInboxHeader } from './BookmarksInboxHeader';
import { BookmarkNeedRow } from './BookmarkNeedRow';
import { BookmarksEmptyState } from './BookmarksEmptyState';

export function BookmarksPanel() {
  const { navigateTo, push } = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const bookmarkedRequestIds = useAppStore((s) => s.bookmarkedRequests);
  const setBookmarkIds = useAppStore((s) => s.setBookmarkIds);

  const isBusinessUser = currentUser?.role === 'SPECIALIST';

  const [items, setItems] = useState<BookmarkNeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookmarkInboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookmarks', { headers: getClientAuthHeaders() });
      const data = (await res.json()) as {
        error?: string;
        bookmarkedRequests?: Parameters<typeof mapBookmarkApiToNeedItem>[0][];
        bookmarkedSpecialists?: { id: string }[];
      };

      if (!res.ok) {
        throw new Error(data.error ?? 'خطا در دریافت علاقه‌مندی‌ها');
      }

      const mapped = (data.bookmarkedRequests ?? []).map(mapBookmarkApiToNeedItem);
      setItems(mapped);
      setBookmarkIds(
        mapped.map((r) => r.id),
        (data.bookmarkedSpecialists ?? []).map((s) => s.id)
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'خطا در دریافت علاقه‌مندی‌ها';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [setBookmarkIds]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const syncedItems = useMemo(
    () => items.filter((i) => bookmarkedRequestIds.includes(i.id)),
    [items, bookmarkedRequestIds]
  );

  const sortedItems = useMemo(() => sortBookmarkRows(syncedItems), [syncedItems]);
  const visibleItems = useMemo(
    () => filterBookmarkRows(sortedItems, filter, searchQuery),
    [sortedItems, filter, searchQuery]
  );
  const followUpCount = useMemo(() => countNeedsFollowUp(syncedItems), [syncedItems]);

  const handleRemoved = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button type="button" variant="outline" onClick={() => void loadBookmarks()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (syncedItems.length === 0) {
    return (
      <BookmarksEmptyState
        isBusinessUser={isBusinessUser}
        onBrowse={() => push(routeBuilder.search({ market: 'need' }))}
      />
    );
  }

  return (
    <div className="space-y-5">
      <BookmarksInboxHeader
        totalCount={syncedItems.length}
        followUpCount={followUpCount}
        isBusinessUser={isBusinessUser}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => void loadBookmarks()}
        >
          <Loader2 className="size-4" aria-hidden />
          بروزرسانی
        </Button>
      </div>

      {visibleItems.length === 0 ? (
        <BookmarksEmptyState
          isBusinessUser={isBusinessUser}
          onBrowse={() => push(routeBuilder.search({ market: 'need' }))}
          filteredEmpty
        />
      ) : (
        <div className="space-y-3" role="list" aria-label="لیست علاقه‌مندی‌ها">
          {visibleItems.map((item) => (
            <BookmarkNeedRow
              key={item.id}
              item={item}
              isBusinessUser={isBusinessUser}
              onRemoved={handleRemoved}
              onOpenDetail={(id) => navigateTo('request-detail', { id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
