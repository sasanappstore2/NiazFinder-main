'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Store, Loader2, BadgeCheck, Star } from 'lucide-react';
import { ContactActions } from '@/components/contact/ContactActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { routeBuilder } from '@/config/routes';
import type { MatchedBusinessItem, MatchedBusinessesResponse } from '@/contracts/need-match';

interface MatchedBusinessesSectionProps {
  requestId: string;
  onBriefSummary?: (summary: string) => void;
  /** Link to profile includes ?need= for contextual chat */
  needContextId?: string;
}

export function MatchedBusinessesSection({
  requestId,
  onBriefSummary,
  needContextId,
}: MatchedBusinessesSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MatchedBusinessesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { rootMargin: '120px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || data || loading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/requests/${encodeURIComponent(requestId)}/matched-businesses?limit=12`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'خطا در بارگذاری');
        return json as MatchedBusinessesResponse;
      })
      .then((payload) => {
        if (cancelled) return;
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
  }, [started, requestId, data, loading]);

  return (
    <section className="mt-8" aria-label="کسب‌وکارهای پیشنهادی">
      <div ref={sentinelRef} className="h-1" aria-hidden />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Store className="size-5 text-primary" />
          <h2 className="text-h3 font-semibold">کسب‌وکارهای پیشنهادی</h2>
        </div>
        {data?.meta.engine === 'internal' && (
          <Badge variant="outline" className="gap-1 text-caption">
            <Sparkles className="size-3" />
            تطبیق هوشمند
          </Badge>
        )}
      </div>

      <p className="text-body-sm text-muted-foreground mb-6">
        فروشگاه‌ها و کسب‌وکارهایی که احتمالاً می‌توانند این نیاز را برطرف کنند — با اسکرول
        بارگذاری می‌شوند.
      </p>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">{error}</p>
      )}

      {!loading && !error && data && data.businesses.length === 0 && (
        <p className="text-body-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
          فعلاً کسب‌وکار مرتبطی یافت نشد.
        </p>
      )}

      {data && data.businesses.length > 0 && (
        <ul className="space-y-3">
          {data.businesses.map((b) => (
            <MatchedBusinessRow key={b.id} business={b} requestId={needContextId ?? requestId} />
          ))}
        </ul>
      )}

      {!started && !loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-caption text-muted-foreground">
          <Loader2 className="size-4 animate-spin opacity-50" />
          در انتظار اسکرول…
        </div>
      )}
    </section>
  );
}

function MatchedBusinessRow({
  business,
  requestId,
}: {
  business: MatchedBusinessItem;
  requestId: string;
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
        </div>
      </div>
    </li>
  );
}
