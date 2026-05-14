'use client';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { RequestDetail } from '@/components/requests/RequestDetail';

export default function RequestDetailRoute() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <RequestDetail />
    </div>
  );
}
