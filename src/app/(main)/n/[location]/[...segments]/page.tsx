import type { Metadata } from 'next';
import {
  generateSearchMarketplaceMetadata,
  SearchMarketplacePage,
} from '@/components/browse/SearchMarketplacePage';

interface PageProps {
  params: Promise<{ location: string; segments: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateSearchMarketplaceMetadata({ ...props, market: 'need' });
}

export default function NeedSegmentsBrowsePage(props: PageProps) {
  return SearchMarketplacePage({ ...props, market: 'need' });
}
