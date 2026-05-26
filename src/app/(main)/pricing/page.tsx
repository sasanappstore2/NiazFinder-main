'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { PricingSection } from '@/components/home/PricingSection';

export default function PricingRoute() {
  return (
    <PageContainer width="wide">
      <Breadcrumb />
      <Separator className="my-4" />
      <PricingSection />
    </PageContainer>
  );
}
