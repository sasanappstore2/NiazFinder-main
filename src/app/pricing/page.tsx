'use client';

import { PricingSection } from '@/components/home/PricingSection';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';

export default function PricingPage() {
  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <PricingSection />
    </div>
  );
}
