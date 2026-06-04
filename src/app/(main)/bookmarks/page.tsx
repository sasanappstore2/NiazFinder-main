'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { BookmarksPanel } from '@/components/bookmarks/BookmarksPanel';

export default function BookmarksRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium">
        <Breadcrumb />
        <Separator className="my-4" />
        <BookmarksPanel />
      </PageContainer>
    </AuthGuard>
  );
}
