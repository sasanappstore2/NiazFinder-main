'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { PricingSection } from '@/components/home/PricingSection';
import { SITE_LABELS } from '@/config/site-labels';

export default function PricingRoute() {
  return (
    <PageContainer width="wide" className="space-y-6">
      <PageChrome title={SITE_LABELS.pricing} />
      <PricingSection />
    </PageContainer>
  );
}
