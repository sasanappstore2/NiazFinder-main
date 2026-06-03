'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Store, Loader2, BadgeCheck, Star } from 'lucide-react';
import { ContactActions } from '@/components/contact/ContactActions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { routeBuilder } from '@/config/routes';
import type { MatchedBusinessItem, MatchedBusinessesResponse } from '@/contracts/need-match';

const TABLET_MAX = 1023;

export type MatchedBusinessesViewerRole = 'owner' | 'business' | 'staff';

interface MatchedBusinessesSectionProps {
  requestId: string;
  viewerRole: MatchedBusinessesViewerRole;
  onBriefSummary?: (summary: string) => void;
  /** Link to profile includes ?need= for contextual chat */
  needContextId?: string;
}

export function MatchedBusinessesSection({
  requestId,
  viewerRole,
  onBriefSummary,
  needContextId,
}: MatchedBusinessesSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MatchedBusinessesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [started, setStarted] = useState(false);

  const isOwnerView = viewerRole === 'owner' || viewerRole === 'staff';
  const isStaffDebug = viewerRole === 'staff';
  const sectionTitle = isStaffDebug
    ? 'کسب‌وکارهای پیشنهادی (دیباگ)'
    : viewerRole === 'owner'
      ? 'کسب‌وکارهای پیشنهادی'
      : 'تطابق با کسب‌وکار شما';
  const sectionDescription = isStaffDebug
    ? 'نمایش کامل تطبیق‌ها برای کارمندان و مدیر — فقط برای دیباگ و پشتیبانی.'
    : viewerRole === 'owner'
      ? 'فروشگاه‌ها و کسب‌وکارهایی که احتمالاً می‌توانند این نیاز را برطرف کنند.'
      : 'بررسی هم‌خوانی این نیاز با پروفایل کسب‌وکار شما.';

  useEffect(() => {
    const eagerMq = window.matchMedia(`(max-width: ${TABLET_MAX}px)`);
    if (eagerMq.matches) {
      setStarted(true);
      return;
    }

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
        }
      },
      { rootMargin: '120px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || data || loading || forbidden) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/requests/${encodeURIComponent(requestId)}/matched-businesses?limit=12`, {
      headers: getClientAuthHeaders(),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return null;
        }
        if (!res.ok) throw new Error(json.error || 'خطا در بارگذاری');
        return json as MatchedBusinessesResponse;
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        setData(payload);
        onBriefSummary?.(payload.briefSummary ?? '');
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'خطا');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [started, requestId, data, loading, forbidden, onBriefSummary]);

  if (forbidden) return null;

  const showEmptyBusinessHint =
    !loading && !error && data && data.businesses.length === 0 && !isOwnerView;

  if (showEmptyBusinessHint) return null;

  return (
    <section
      className="need-detail-scroll-section mt-8"
      aria-label={sectionTitle}
    >
      <div ref={sentinelRef} className="h-1 lg:h-px" aria-hidden />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Store className="size-5 text-primary" />
          <h2 className="text-h3 font-semibold">{sectionTitle}</h2>
        </div>
        {data?.meta.engine === 'internal' && isOwnerView && (
          <Badge variant="outline" className="gap-1 text-caption">
            <Sparkles className="size-3" />
            {isStaffDebug ? 'دیباگ تطبیق' : 'تطبیق هوشمند'}
          </Badge>
        )}
      </div>

      <p className="text-body-sm text-muted-foreground mb-4">{sectionDescription}</p>

      <MatchedBusinessesBox
        loading={loading}
        error={error}
        data={data}
        started={started}
        requestId={needContextId ?? requestId}
        viewerRole={viewerRole}
        skeletonCount={isOwnerView ? 3 : 1}
      />
    </section>
  );
}

export function MatchedBusinessesBox({
  loading,
  error,
  data,
  started,
  requestId,
  viewerRole,
  skeletonCount = 3,
}: {
  loading: boolean;
  error: string | null;
  data: MatchedBusinessesResponse | null;
  started: boolean;
  requestId: string;
  viewerRole?: MatchedBusinessesViewerRole;
  skeletonCount?: number;
}) {
  const isOwnerView = viewerRole === 'owner' || viewerRole === 'staff';
  const emptyMessage = isOwnerView
    ? 'فعلاً کسب‌وکار مرتبطی یافت نشد.'
    : 'این نیاز با کسب‌وکار شما هم‌خوانی ندارد.';

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm sm:p-5">
      {loading && (
        <ul className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری پیشنهادها">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <MatchedBusinessRowSkeleton key={i} />
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">{error}</p>
      )}

      {!loading && !error && data && data.businesses.length === 0 && isOwnerView && (
        <p className="text-body-sm text-muted-foreground rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          {emptyMessage}
        </p>
      )}

      {!loading && data && data.businesses.length > 0 && (
        <ul className="space-y-3">
          {data.businesses.map((b) => (
            <MatchedBusinessRow
              key={b.id}
              business={b}
              requestId={requestId}
              showContactActions={isOwnerView}
            />
          ))}
        </ul>
      )}

      {!started && !loading && isOwnerView && (
        <div className="hidden flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center lg:flex">
          <Loader2 className="size-5 animate-spin text-muted-foreground/60" />
          <p className="text-body-sm text-muted-foreground">
            با اسکرول به این بخش، پیشنهادها بارگذاری می‌شوند
          </p>
        </div>
      )}
    </div>
  );
}

export function MatchedBusinessRowSkeleton() {
  return (
    <li className="rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="flex gap-3">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-36 max-w-[60%] rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-4/5 rounded-md" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-3 w-14 rounded-md" />
            <Skeleton className="h-3 w-10 rounded-md" />
          </div>
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </li>
  );
}

function MatchedBusinessRow({
  business,
  requestId,
  showContactActions = true,
}: {
  business: MatchedBusinessItem;
  requestId: string;
  showContactActions?: boolean;
}) {
  const profileHref = `${routeBuilder.pro(business.userId)}?need=${encodeURIComponent(requestId)}`;
  const scorePercent = Math.round(business.matchScore * 100);

  return (
    <li className="rounded-xl border border-border/50 bg-card/60 p-4 transition-colors hover:border-primary/30 hover:bg-card">
      <div className="flex gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
          {business.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-semibold truncate">{business.name}</h3>
            {business.verified && (
              <BadgeCheck className="size-4 text-primary shrink-0" aria-label="تأیید شده" />
            )}
            <Badge variant="secondary" className="text-overline tabular-nums">
              {scorePercent}٪ تطابق
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground mt-1">{business.matchReasonFa}</p>
          {business.topOfferTitle && (
            <p className="text-caption text-foreground/80 mt-1">خدمت: {business.topOfferTitle}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
            {business.city && <span>{business.city}</span>}
            {business.rating > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {business.rating.toLocaleString('fa-IR')}
              </span>
            )}
          </div>
          {showContactActions && (
            <div className="mt-3">
              <ContactActions
                otherUserId={business.userId}
                requestId={requestId}
                displayName={business.name}
                hasPhone={business.hasPhone ?? true}
                chatEnabled={business.chatEnabled ?? true}
                profileHref={profileHref}
                variant="compact"
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
