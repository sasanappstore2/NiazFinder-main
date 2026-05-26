import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer noVerticalPadding className="space-y-6 py-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </PageContainer>
  );
}
