'use client';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { BrowseSpecialists } from '@/components/specialists/BrowseSpecialists';

export default function BrowseSpecialistsRoute() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <BrowseSpecialists />
    </div>
  );
}
