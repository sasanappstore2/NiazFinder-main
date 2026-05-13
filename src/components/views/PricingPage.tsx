'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { PricingSection } from '@/components/home/PricingSection';

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><PricingSection />
    </div>
  );
}
