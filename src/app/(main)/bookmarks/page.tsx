'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { BookmarksPanel } from '@/components/bookmarks/BookmarksPanel';
import { SITE_LABELS } from '@/config/site-labels';

export default function BookmarksRoute() {
  return (
    <AuthGuard>
      <PageContainer width="medium" className="space-y-6">
        <PageChrome title={SITE_LABELS.bookmarks} />
        <BookmarksPanel />
      </PageContainer>
    </AuthGuard>
  );
}
