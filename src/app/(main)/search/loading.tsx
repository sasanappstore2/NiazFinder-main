import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer width="medium" noVerticalPadding className="space-y-4 py-12 pt-4">
      <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </PageContainer>
  );
}
