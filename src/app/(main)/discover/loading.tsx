import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer noVerticalPadding className="space-y-6 py-12">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    </PageContainer>
  );
}
