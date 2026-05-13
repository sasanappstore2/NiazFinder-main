'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ReferralPage } from '@/components/dashboard/ReferralPage';

export default function ReferralPageView() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><ReferralPage />
    </div>
  );
}
