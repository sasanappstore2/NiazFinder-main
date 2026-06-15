'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

/** Edit flow deferred — manual wizard rebuild; redirect to dashboard. */
export default function PostEditPage() {
  const router = useRouter();

  useEffect(() => {
    toast.info('ویرایش آگهی از این مسیر موقتاً غیرفعال است');
    router.replace('/dashboard?tab=requests');
  }, [router]);

  return (
    <PageContainer width="intake" className="py-16 text-center text-muted-foreground">
      <Loader2 className="mx-auto mb-3 size-8 animate-spin" />
      در حال انتقال…
    </PageContainer>
  );
}
