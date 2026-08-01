'use client';

import { useRouter } from 'next/navigation';
import { FilingCrawlWizard } from '@/components/admin/modules/filing-crawl/FilingCrawlWizard';

export default function FilingWizardPage() {
  const router = useRouter();
  return <FilingCrawlWizard onClose={() => router.push('/super-admin/filings')} />;
}
