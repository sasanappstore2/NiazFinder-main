'use client';

import { CompareSpecialists } from '@/components/specialists/CompareSpecialists';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';

export default function ComparePage() {
  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <CompareSpecialists />
    </div>
  );
}
