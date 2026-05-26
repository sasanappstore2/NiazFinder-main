'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NeedIntakePanel } from '@/components/need-intake';

function NeedIntakeContent() {
  const searchParams = useSearchParams();
  const seed = searchParams.get('seed') ?? '';

  return (
    <PageContainer width="narrow">
      <Breadcrumb />
      <Separator className="my-4" />
      <h1 className="text-xl font-bold mb-4">ثبت نیاز جدید</h1>
      <NeedIntakePanel key={seed || 'empty'} initialSeed={seed} />
    </PageContainer>
  );
}

export default function NeedIntakePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">بارگذاری…</div>}>
      <NeedIntakeContent />
    </Suspense>
  );
}
