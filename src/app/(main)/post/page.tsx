'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NeedIntakePanel } from '@/components/need-intake';

/** Canonical URL for need intake is `/post` (see next.config redirects). */
function PostNeedContent() {
  const searchParams = useSearchParams();
  const seed = searchParams.get('seed') ?? '';
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const phone = searchParams.get('phone');
  const panelKey = [seed, category, city, phone].filter(Boolean).join('|') || 'empty';

  return (
    <PageContainer width="narrow">
      <Breadcrumb />
      <Separator className="my-4" />
      <h1 className="text-xl font-bold mb-4">ثبت نیاز جدید</h1>
      <NeedIntakePanel
        key={panelKey}
        initialSeed={seed}
        initialCategory={category}
        initialCity={city}
        initialPhone={phone}
      />
    </PageContainer>
  );
}

export default function PostNeedPage() {
  return (
    <Suspense
      fallback={
        <PageContainer width="narrow" noVerticalPadding className="py-12 text-center text-muted-foreground">
          بارگذاری…
        </PageContainer>
      }
    >
      <PostNeedContent />
    </Suspense>
  );
}
