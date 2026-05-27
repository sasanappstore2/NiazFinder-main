'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import ReviewForm from '@/components/business/ReviewForm';

export default function SubmitReviewRoute() {
  return (
    <PageContainer width="content">
      <Breadcrumb />
      <Separator className="my-4" />
      <ReviewForm />
    </PageContainer>
  );
}
