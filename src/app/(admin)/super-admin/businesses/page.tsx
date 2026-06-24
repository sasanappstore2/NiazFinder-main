import { Suspense } from 'react';
import { SuperAdminPageClient } from '@/components/admin/SuperAdminPageClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminBusinessesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <SuperAdminPageClient section="businesses" />
    </Suspense>
  );
}
