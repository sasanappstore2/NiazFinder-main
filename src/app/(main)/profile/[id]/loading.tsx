import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer width="content" noVerticalPadding className="space-y-6 py-12">
      <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
    </PageContainer>
  );
}
