'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, ExternalLink, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkspaceBoard } from '@/components/workspace/kanban/WorkspaceBoard';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import { useBusinessHub } from '@/components/business-profile/hub/BusinessHubContext';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';

export function WorkspacePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminPreview = searchParams.get('adminPreview') === '1';
  const { profile, loading, refresh } = useBusinessHub();

  useEffect(() => {
    if (adminPreview) return;
    void refresh();
  }, [adminPreview, refresh]);

  useEffect(() => {
    if (adminPreview || loading) return;
    if (!profile) {
      router.replace(routeBuilder.myBusiness());
      return;
    }
    if (!isRealEstateBusiness(profile.occupationSlugs)) {
      router.replace(routeBuilder.myBusiness());
    }
  }, [adminPreview, loading, profile, router]);

  if (adminPreview) {
    return (
      <PageContainer width="full">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
              <Building2 className="size-5 text-emerald-600" aria-hidden />
              میزکار املاک
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              پیش‌نمایش ادمین — نیازها، فایلینگ منطقه، همکاری و پیگیری
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={routeBuilder.filingBrowse()}>
              <ExternalLink className="size-3.5" />
              فایلینگ عمومی
            </Link>
          </Button>
        </header>
        <WorkspaceBoard adminPreview />
      </PageContainer>
    );
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  if (!profile || !isRealEstateBusiness(profile.occupationSlugs)) {
    return null;
  }

  return (
    <PageContainer width="full">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
            <Building2 className="size-5 text-emerald-600" aria-hidden />
            میزکار املاک
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نیازها، فایل‌های منطقه، همکاری‌ها و پیگیری — در یک نمای Trello
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={routeBuilder.filingBrowse()}>
              <ExternalLink className="size-3.5" />
              فایلینگ عمومی
            </Link>
          </Button>
          {!adminPreview ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={routeBuilder.myBusiness()}>کسب‌وکار من</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <WorkspaceBoard adminPreview={adminPreview} />
    </PageContainer>
  );
}
