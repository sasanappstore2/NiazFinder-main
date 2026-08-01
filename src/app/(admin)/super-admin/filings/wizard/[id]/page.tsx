'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { FilingCrawlWizard } from '@/components/admin/modules/filing-crawl/FilingCrawlWizard';

export default function FilingWizardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <FilingCrawlWizard
      scraperId={id}
      onClose={() => router.push('/super-admin/filings')}
    />
  );
}
