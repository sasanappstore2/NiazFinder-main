import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer width="medium" noVerticalPadding className="space-y-6 py-12">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </PageContainer>
  );
}
