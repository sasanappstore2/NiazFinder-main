'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eraser } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { SITE_LABELS } from '@/config/site-labels';
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
      <PageContainer width="intake" noVerticalPadding className="pt-2 pb-0 sm:pt-3 lg:pt-2">
        <div className="intake-page-breadcrumb--mobile-collapse">
          <PageChrome
            title={SITE_LABELS.postNeed}
            hideSeparator
            separatorClassName="intake-page-separator my-2 sm:my-3 lg:my-2"
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleClearForm}
              >
                <Eraser className="size-4" />
                <span className="hidden sm:inline">پاک کردن فرم</span>
                <span className="sm:hidden">پاک کردن</span>
              </Button>
            }
          />
        </div>
      </PageContainer>
      <PageContainer
        width="intake"
        as="section"
        className="intake-page--compact sm:pb-8"
      >
        <Separator className="intake-page-separator my-2 sm:my-3 lg:my-2" />
        <div className="intake-page-head intake-page-head--slim sr-only">
          <span className="intake-page-head__title min-w-0">{SITE_LABELS.postNeed}</span>
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
