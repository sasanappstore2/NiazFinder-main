import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer noVerticalPadding className="space-y-6 py-12">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-xl bg-muted/50" />
    </PageContainer>
  );
}
