'use client';

import { RequestDetail } from '@/components/requests/RequestDetail';
import { use } from 'react';

interface RequestDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { slug } = use(params);

  return (
    <div className="max-w-5xl mx-auto">
      <RequestDetail slug={slug} />
    </div>
  );
}
