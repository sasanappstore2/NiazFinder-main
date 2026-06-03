'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { buildNeedBrowseAlertFingerprint } from '@/lib/need-alerts/fingerprint';
import type { BrowseFilters } from '@/lib/filters/parser';
import { cn } from '@/lib/utils';

interface NeedBrowseAlertButtonProps {
  browsePath: string;
  categorySlug?: string;
  citySlugs?: string[];
  filters?: Partial<BrowseFilters>;
  searchQuery?: string;
  label: string;
  className?: string;
}

export function NeedBrowseAlertButton({
  browsePath,
  categorySlug,
  citySlugs = [],
  filters,
  searchQuery,
  label,
  className,
}: NeedBrowseAlertButtonProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const fingerprint = useMemo(
    () =>
      buildNeedBrowseAlertFingerprint({
        browsePath,
        categorySlug,
        citySlugs,
        filters,
        searchQuery,
      }),
    [browsePath, categorySlug, citySlugs, filters, searchQuery]
  );

  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated || !authToken) {
      setSubscribed(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/need-alerts?fingerprint=${encodeURIComponent(fingerprint)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        setSubscribed(false);
        return;
      }
      const data = (await res.json()) as { subscribed?: boolean };
      setSubscribed(Boolean(data.subscribed));
    } catch {
      setSubscribed(false);
    } finally {
      setChecking(false);
    }
  }, [authToken, fingerprint, isAuthenticated]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const toggle = async () => {
    if (!isAuthenticated || !authToken) {
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      if (subscribed) {
        const res = await fetch(
          `/api/need-alerts?fingerprint=${encodeURIComponent(fingerprint)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (!res.ok) throw new Error('خطا');
        setSubscribed(false);
        toast.success('اعلان این صفحه غیرفعال شد');
      } else {
        const res = await fetch('/api/need-alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            browsePath,
            categorySlug: categorySlug ?? null,
            citySlugs,
            filters: filters ?? {},
            searchQuery: searchQuery ?? null,
            label,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'خطا');
        }
        setSubscribed(true);
        toast.success('وقتی نیاز جدیدی در این صفحه ثبت شود به شما اعلان می‌دهیم');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در تنظیم اعلان');
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || checking;

  return (
    <Button
      type="button"
      variant={subscribed ? 'default' : 'outline'}
      className={cn(
        'gap-2',
        subscribed && 'bg-emerald-600 text-white hover:bg-emerald-700',
        className
      )}
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={subscribed}
      aria-label={
        subscribed
          ? 'غیرفعال کردن اعلان نیازهای این صفحه'
          : 'فعال کردن اعلان برای نیازهای جدید این صفحه'
      }
      title={
        subscribed
          ? 'اعلان فعال است — برای خاموش کردن بزنید'
          : 'با ثبت نیاز جدید در همین دسته و فیلترها اعلان بگیرید'
      }
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : subscribed ? (
        <BellRing className="size-4" aria-hidden />
      ) : (
        <Bell className="size-4" aria-hidden />
      )}
      {subscribed ? 'اعلان فعال' : 'اعلان'}
    </Button>
  );
}
