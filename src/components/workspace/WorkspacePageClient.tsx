'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import { SITE_LABELS } from '@/config/site-labels';
import { useBusinessHub } from '@/components/business-profile/hub/BusinessHubContext';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';

function WorkspaceActions({ adminPreview }: { adminPreview: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={routeBuilder.filingBrowse()}>
          <ExternalLink className="size-3.5" />
          فایلینگ عمومی
        </Link>
      </Button>
      {!adminPreview ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={routeBuilder.myBusiness()}>{SITE_LABELS.myBusiness}</Link>
        </Button>
      ) : null}
    </div>
  );
}

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
      <PageContainer width="full" noVerticalPadding className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-900 lg:px-6 dark:text-amber-200">
          پیش‌نمایش ادمین — داده‌های نمونه برای بررسی چیدمان میزکار
        </div>
        <WorkspacePage adminPreview headerActions={<WorkspaceActions adminPreview />} />
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
    <PageContainer width="full" noVerticalPadding className="flex min-h-0 flex-1 flex-col">
      <WorkspacePage headerActions={<WorkspaceActions adminPreview={adminPreview} />} />
    </PageContainer>
  );
}
