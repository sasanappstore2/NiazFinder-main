'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Paperclip } from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import {
  readNeedChatPreview,
  type NeedChatPreview,
} from '@/lib/contact/need-chat-preview';
import { cn } from '@/lib/utils';

interface ConversationNeedContextBannerProps {
  requestId: string;
  /** When true, render as an in-thread attachment (quote-style) instead of a full-width header strip. */
  embedded?: boolean;
  className?: string;
}

export function ConversationNeedContextBanner({
  requestId,
  embedded = false,
  className,
}: ConversationNeedContextBannerProps) {
  const [preview, setPreview] = useState<NeedChatPreview | null>(() =>
    readNeedChatPreview(requestId)
  );
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    const cached = readNeedChatPreview(requestId);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/requests/${encodeURIComponent(requestId)}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          request?: {
            id: string;
            title: string;
            categoryName?: string;
            city?: string;
          };
        };
        if (!res.ok) throw new Error(json.error);
        const data = json.request;
        if (!data?.id || !data?.title) throw new Error('invalid');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setPreview({
          id: data.id,
          title: data.title,
          categoryName: data.categoryName,
          city: data.city,
        });
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loading) {
    if (embedded) {
      return (
        <div
          className={cn(
            'mx-auto w-full max-w-[min(100%,20rem)] px-1 py-1',
            className
          )}
          aria-busy="true"
        >
          <div
            className="flex items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground"
            dir="rtl"
          >
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
            بارگذاری آگهی پیوست‌شده…
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          'flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2 text-xs text-muted-foreground',
          className
        )}
        aria-busy="true"
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        در حال بارگذاری نیاز مرتبط…
      </div>
    );
  }

  if (!preview) return null;

  const subtitle = [preview.categoryName, preview.city].filter(Boolean).join(' · ');
  const href = routeBuilder.need(preview.id, preview.title);

  if (embedded) {
    return (
      <div
        className={cn('mx-auto w-full max-w-[min(100%,22rem)] px-1 py-1', className)}
        dir="rtl"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-border/60 bg-muted/35 shadow-sm',
            'border-s-[3px] border-s-primary'
          )}
          role="note"
          aria-label={`آگهی پیوست‌شده: ${preview.title}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,oklch(var(--primary)/0.06),transparent_55%)]" />
          <div className="relative space-y-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Paperclip className="size-3 shrink-0 opacity-70" aria-hidden />
              آگهی پیوست‌شده به این گفتگو
            </div>
            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
              {preview.title}
            </p>
            {subtitle ? (
              <p className="text-xs leading-normal text-muted-foreground line-clamp-1">{subtitle}</p>
            ) : null}
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-lg py-1 text-xs font-semibold text-primary hover:underline underline-offset-2"
            >
              مشاهده آگهی
              <ExternalLink className="size-3 opacity-70" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Legacy strip layout (reserved if reused outside message list) */
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-primary/15 bg-primary/5 px-4 py-2',
        className
      )}
      dir="rtl"
    >
      <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-overline text-muted-foreground">در رابطه با این نیاز</p>
        <p className="truncate text-sm font-medium leading-tight">{preview.title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
      >
        مشاهده
        <ExternalLink className="size-3" aria-hidden />
      </Link>
    </div>
  );
}
