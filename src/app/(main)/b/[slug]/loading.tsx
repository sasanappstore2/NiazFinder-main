import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/skeleton';

export default function BusinessRouteLoading() {
  return (
    <PageContainer noVerticalPadding className="pt-2 pb-8">
      <Skeleton className="mb-4 h-5 w-48" />
      <Skeleton className="mb-6 h-9 w-full max-w-xl" />
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}
