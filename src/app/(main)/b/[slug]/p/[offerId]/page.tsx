import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { ProductDetailActions } from '@/components/business-profile/ProductDetailActions';
import { routeBuilder } from '@/config/routes';
import { loadBusinessByProfileSlug } from '@/lib/business/load-profile';
import { SITE_NAME } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ need?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, offerId } = await params;
  const business = await loadBusinessByProfileSlug(slug);
  const offer = business?.offers.find((o) => o.id === offerId);
  if (!business || !offer) return { title: SITE_NAME };
  return {
    title: `${offer.title} | ${business.name}`,
    description: offer.description.slice(0, 160),
    alternates: { canonical: routeBuilder.businessProduct(slug, offerId) },
  };
}

export default async function BusinessProductPage({ params, searchParams }: PageProps) {
  const { slug, offerId } = await params;
  const { need } = await searchParams;
  const business = await loadBusinessByProfileSlug(slug);
  if (!business) notFound();

  const offer = business.offers.find((o) => o.id === offerId);
  if (!offer) notFound();

  return (
    <PageContainer width="wide">
      <ProductDetailActions business={business} offer={offer} requestId={need} />
    </PageContainer>
  );
}
