'use client';

import { SpecialistProfile } from '@/components/specialists/SpecialistProfile';
import { use } from 'react';

interface SpecialistProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function SpecialistProfilePage({ params }: SpecialistProfilePageProps) {
  const { id } = use(params);

  return (
    <div className="max-w-6xl mx-auto">
      <SpecialistProfile specialistId={id} />
    </div>
  );
}
