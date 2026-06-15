import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  generateSearchMarketplaceMetadata,
  SearchMarketplacePage,
} from '@/components/browse/SearchMarketplacePage';
import { isMarketplaceLocationSegment } from '@/config/market-routes';

interface PageProps {
  params: Promise<{ slug: string; segments: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isMarketplaceLocationSegment(slug)) return { title: 'کسب‌وکار' };
  return generateSearchMarketplaceMetadata({
    params: Promise.resolve({ location: slug, segments: (await props.params).segments }),
    searchParams: props.searchParams,
    market: 'business',
  });
}

export default async function BusinessSegmentsBrowsePage(props: PageProps) {
  const { slug, segments } = await props.params;
  if (!isMarketplaceLocationSegment(slug)) notFound();
  return SearchMarketplacePage({
    params: Promise.resolve({ location: slug, segments }),
    searchParams: props.searchParams,
    market: 'business',
  });
}
