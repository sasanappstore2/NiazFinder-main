'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import ReviewForm from '@/components/specialists/ReviewForm';

export default function ReviewFormPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><ReviewForm />
    </div>
  );
}
