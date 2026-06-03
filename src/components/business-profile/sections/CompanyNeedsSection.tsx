'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { routeBuilder } from '@/config/routes';
import type { SectionProps } from './types';

type CompanyNeedItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  moderationStatus: string;
  createdAt: string;
  city?: string | null;
};

export function CompanyNeedsSection({ business }: SectionProps) {
  const [needs, setNeeds] = useState<CompanyNeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/business/${business.userId}/needs`);
        if (!res.ok) return;
        const data = (await res.json()) as { needs?: CompanyNeedItem[] };
        if (!cancelled) setNeeds(data.needs ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [business.userId]);

  const statusLabel: Record<string, string> = {
    OPEN: 'باز',
    PENDING_REVIEW: 'در انتظار بررسی',
    IN_PROGRESS: 'در حال انجام',
    CLOSED: 'بسته',
    CANCELLED: 'لغو شده',
  };

  return (
    <section id="section-companyNeeds" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">نیازهای شرکت</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/post?as=company&linkBusiness=1">
            <Plus className="ml-1.5 size-4" />
            ثبت نیاز جدید
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : needs.length === 0 ? (
        <div className="profile-surface rounded-2xl border border-dashed px-6 py-12 text-center">
          <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">هنوز نیازی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {needs.map((need) => (
            <li key={need.id}>
              <Link
                href={routeBuilder.listing(need.id, need.title)}
                className="profile-surface flex flex-wrap items-center justify-between gap-2 rounded-xl p-4 transition hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-medium">{need.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {need.city ?? 'سراسر کشور'} ·{' '}
                    {new Date(need.createdAt).toLocaleDateString('fa-IR')}
                  </p>
                </div>
                <Badge variant="secondary">
                  {statusLabel[need.status] ?? need.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
