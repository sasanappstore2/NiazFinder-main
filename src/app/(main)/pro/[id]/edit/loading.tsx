import { Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BusinessEditLoading() {
  return (
    <PageContainer width="wide">
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری...
      </div>
    </PageContainer>
  );
}
