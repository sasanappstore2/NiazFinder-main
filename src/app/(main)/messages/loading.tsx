import { PageContainer } from '@/components/layout/PageContainer';

export default function Loading() {
  return (
    <PageContainer noVerticalPadding className="py-12">
      <div className="h-[60vh] animate-pulse rounded-xl bg-muted/50" />
    </PageContainer>
  );
}
