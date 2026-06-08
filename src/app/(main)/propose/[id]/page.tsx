'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ProposalSubmitSheet } from '@/components/need/ProposalSubmitSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { routeBuilder } from '@/config/routes';

function ProposeByIdContent() {
  const params = useParams();
  const requestId = typeof params?.id === 'string' ? params.id : '';
  const fetchRequestDetail = useAppStore((s) => s.fetchRequestDetail);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notPublished, setNotPublished] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setMissing(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchRequestDetail(requestId).then((row) => {
      if (cancelled) return;
      if (row?.title) {
        setTitle(row.title);
      } else {
        setMissing(true);
      }
      setLoading(false);
    }).catch((err: unknown) => {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('NOT_PUBLISHED') || msg.includes('منتشر')) {
        setNotPublished(true);
      } else {
        setMissing(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, fetchRequestDetail]);

  if (loading) {
    return (
      <PageContainer width="medium" className="pb-16">
        <Skeleton className="mb-4 h-5 w-48" />
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </PageContainer>
    );
  }

  if (notPublished) {
    return (
      <PageContainer width="medium" className="pb-16">
        <Breadcrumb />
        <Separator className="my-4" />
        <h1 className="text-xl font-bold">نیاز هنوز منتشر نشده</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          این نیاز در صف بازبینی است و پس از تأیید امکان ارسال پیشنهاد فعال می‌شود.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={routeBuilder.search({ market: 'need' })}>بازگشت به بازار نیازها</Link>
        </Button>
      </PageContainer>
    );
  }

  if (missing || !title) {
    return (
      <PageContainer width="medium" className="pb-16">
        <Breadcrumb />
        <Separator className="my-4" />
        <h1 className="text-xl font-bold">نیاز یافت نشد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          این نیاز وجود ندارد یا دیگر فعال نیست.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={routeBuilder.search({ market: 'need' })}>بازگشت به بازار نیازها</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="medium" className="pb-16">
      <Breadcrumb />
      <Separator className="my-4" />
      <h1 className="text-2xl font-bold">ارسال پیشنهاد</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        پیشنهاد قیمت و زمان تحویل خود را برای این نیاز ثبت کنید.
      </p>
      <ProposalSubmitSheet requestId={requestId} requestTitle={title} />
    </PageContainer>
  );
}

export default function ProposeByIdPage() {
  return (
    <AuthGuard>
      <ProposeByIdContent />
    </AuthGuard>
  );
}
