'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NeedIntakePanel } from '@/components/need-intake';

/** Canonical URL for need intake is `/post` (see next.config redirects). */
function PostNeedContent() {
  const searchParams = useSearchParams();
  const seed = searchParams.get('seed') ?? '';

  return (
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <h1 className="text-xl font-bold mb-4">ثبت نیاز جدید</h1>
      <NeedIntakePanel key={seed || 'empty'} initialSeed={seed} />
    </div>
  );
}

export default function PostNeedPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-12 text-center text-muted-foreground">
          بارگذاری…
        </div>
      }
    >
      <PostNeedContent />
    </Suspense>
  );
}
