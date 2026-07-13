import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { BusinessHubProvider } from '@/components/business-profile/hub/BusinessHubContext';
import { WorkspacePageClient } from '@/components/workspace/WorkspacePageClient';

export const metadata: Metadata = {
  title: 'میزکار املاک',
  description: 'میزکار مشاوران املاک — نیازها، فایلینگ منطقه، همکاری و پیگیری',
};

function WorkspaceFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      در حال بارگذاری میزکار...
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <BusinessHubProvider>
        <Suspense fallback={<WorkspaceFallback />}>
          <WorkspacePageClient />
        </Suspense>
      </BusinessHubProvider>
    </AuthGuard>
  );
}
