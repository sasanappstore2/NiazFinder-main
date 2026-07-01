'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkspacePage } from '@/components/workspace';

export default function WorkspaceRoute() {
  return (
    <AuthGuard routeView="workspace">
      <PageContainer
        width="full"
        noVerticalPadding
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <WorkspacePage />
      </PageContainer>
    </AuthGuard>
  );
}
