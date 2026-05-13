'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ProposalForm } from '@/components/requests/ProposalForm';

export default function ProposalFormPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><ProposalForm />
    </div>
  );
}
