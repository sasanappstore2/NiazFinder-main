'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import type { WorkspaceData } from '../types';
import { NeedsColumn } from './columns/NeedsColumn';
import { RegionalFilingsColumn } from './columns/RegionalFilingsColumn';
import { CollaborationsColumn } from './columns/CollaborationsColumn';
import { FollowUpsColumn } from './columns/FollowUpsColumn';

type WorkspaceResponse = WorkspaceData & { adminPreview?: boolean };

const MOBILE_TABS = [
  { id: 'needs' as const, label: 'نیازها' },
  { id: 'files' as const, label: 'فایل‌ها' },
  { id: 'collaborations' as const, label: 'همکاری' },
  { id: 'followups' as const, label: 'پیگیری' },
];

export function WorkspaceBoard({
  adminPreview = false,
  fillHeight = true,
  className,
}: {
  adminPreview?: boolean;
  fillHeight?: boolean;
  className?: string;
}) {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]['id']>('files');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = adminPreview
        ? '/api/business/me/workspace?adminPreview=1'
        : '/api/business/me/workspace';
      const res = await fetch(url, { headers: getClientAuthHeaders() });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'خطا در بارگذاری میزکار');
        setData(null);
        return;
      }
      setData((await res.json()) as WorkspaceResponse);
    } catch {
      setError('خطا در ارتباط با سرور');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[280px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری میزکار...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        <p>{error}</p>
        <button type="button" className="mt-3 underline" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {data.adminPreview ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          پیش‌نمایش ادمین — داده‌های نمونه یا خالی برای بررسی چیدمان میزکار
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/50 bg-muted/30 p-1 lg:hidden">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mobileTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'lg:flex lg:min-h-[min(72vh,760px)] lg:gap-3 lg:overflow-x-auto lg:pb-1',
          fillHeight && 'lg:items-stretch'
        )}
      >
        <div className={cn('lg:contents', mobileTab !== 'needs' && 'hidden lg:contents')}>
          <div className={cn(mobileTab === 'needs' ? 'block' : 'hidden lg:block', 'lg:min-w-[min(100%,280px)] lg:flex-1')}>
            <NeedsColumn
              items={data.needs}
              error={data.errors.needs}
              onRetry={() => void load()}
              fillHeight={fillHeight}
            />
          </div>
        </div>
        <div className={cn(mobileTab === 'files' ? 'block' : 'hidden lg:block', 'lg:min-w-[min(100%,280px)] lg:flex-1')}>
          <RegionalFilingsColumn
            items={data.files}
            feedMeta={data.regionalFeed}
            businessCity={data.profile?.city}
            error={data.errors.files}
            onRetry={() => void load()}
            onAreasSaved={() => void load()}
            fillHeight={fillHeight}
          />
        </div>
        <div className={cn(mobileTab === 'collaborations' ? 'block' : 'hidden lg:block', 'lg:min-w-[min(100%,280px)] lg:flex-1')}>
          <CollaborationsColumn
            items={data.collaborations}
            error={data.errors.collaborations}
            onRetry={() => void load()}
            hasServiceArea={data.collaborationHasServiceArea}
            fillHeight={fillHeight}
          />
        </div>
        <div className={cn(mobileTab === 'followups' ? 'block' : 'hidden lg:block', 'lg:min-w-[min(100%,280px)] lg:flex-1')}>
          <FollowUpsColumn items={data.followUps} fillHeight={fillHeight} />
        </div>
      </div>
    </div>
  );
}
