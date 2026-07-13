import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilingBrowseShell } from '@/components/filing/FilingBrowseShell';
import { FilingBrowseResultsSkeleton } from '@/components/filing/FilingListCardSkeleton';

export const metadata: Metadata = {
  title: 'فایلینگ املاک',
  description: 'مرور فایل‌های منطقه‌ای — قالب نمایش فایلینگ',
};

export default function FilingBrowsePage() {
  return (
    <PageContainer width="full" noVerticalPadding>
      <Suspense fallback={<FilingBrowseResultsSkeleton count={8} />}>
        <FilingBrowseShell />
      </Suspense>
    </PageContainer>
  );
}
