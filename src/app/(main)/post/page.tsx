'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eraser } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { NeedIntakePanel } from '@/components/need-intake';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { clearLeadPhone } from '@/lib/lead-draft';

/** Canonical URL for need intake is `/post` (see next.config redirects). */
function PostNeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetIntake = useNeedIntakeStore((s) => s.reset);
  const [formInstance, setFormInstance] = useState(0);

  const seed = searchParams.get('seed') ?? '';
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const phone = searchParams.get('phone');
  const queryKey = [seed, category, city, phone].filter(Boolean).join('|') || 'empty';
  const panelKey = `${formInstance}:${queryKey}`;

  const handleClearForm = useCallback(() => {
    resetIntake();
    clearLeadPhone();
    setFormInstance((n) => n + 1);
    router.replace('/post');
    toast.success('فرم پاک شد');
  }, [resetIntake, router]);

  return (
    <>
      <PageContainer width="intake" noVerticalPadding className="pt-2 pb-1 sm:pt-3 sm:pb-2 lg:pt-2 lg:pb-0">
        <Breadcrumb />
      </PageContainer>
      <PageContainer width="intake" as="section" className="intake-page--compact pb-6 sm:pb-8 lg:pb-6">
        <Separator className="intake-page-separator my-2 sm:my-3 lg:my-2" />
        <div className="intake-page-head">
          <h1 className="intake-page-head__title min-w-0">ثبت نیاز جدید</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={handleClearForm}
          >
            <Eraser className="size-4" />
            پاک کردن فرم
          </Button>
        </div>
        <NeedIntakePanel
          key={panelKey}
          initialSeed={seed}
          initialCategory={category}
          initialCity={city}
          initialPhone={phone}
        />
      </PageContainer>
    </>
  );
}

export default function PostNeedPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          width="intake"
          as="section"
          noVerticalPadding
          className="py-12 text-center text-muted-foreground"
        >
          بارگذاری…
        </PageContainer>
      }
    >
      <PostNeedContent />
    </Suspense>
  );
}
