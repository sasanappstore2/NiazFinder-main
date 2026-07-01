import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { ProductDetailActions } from '@/components/business-profile/ProductDetailActions';
import { PropertyListingDetailActions } from '@/components/business-profile/PropertyListingDetailActions';
import { routeBuilder } from '@/config/routes';
import { loadBusinessByProfileSlug } from '@/lib/business/load-profile';
import { findListingById } from '@/lib/business/real-estate-listings';
import { SITE_NAME } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string; offerId: string }>;
  searchParams: Promise<{ need?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, offerId } = await params;
  const business = await loadBusinessByProfileSlug(slug);
  if (!business) return { title: SITE_NAME };

  const offer = business.offers.find((o) => o.id === offerId);
  if (offer) {
    return {
      title: `${offer.title} | ${business.name}`,
      description: offer.description.slice(0, 160),
      alternates: { canonical: routeBuilder.businessProduct(slug, offerId) },
    };
  }

  const listing = findListingById(business, offerId);
  if (listing) {
    return {
      title: `${listing.title} | ${business.name}`,
      description: listing.description?.slice(0, 160) ?? listing.location ?? undefined,
      alternates: { canonical: routeBuilder.businessProduct(slug, offerId) },
    };
  }

  return { title: SITE_NAME };
}

export default async function BusinessProductPage({ params, searchParams }: PageProps) {
  const { slug, offerId } = await params;
  const { need } = await searchParams;
  const business = await loadBusinessByProfileSlug(slug);
  if (!business) notFound();

  const offer = business.offers.find((o) => o.id === offerId);
  if (offer) {
    return (
      <PageContainer width="wide">
        <ProductDetailActions business={business} offer={offer} requestId={need} />
      </PageContainer>
    );
  }

  const listing = findListingById(business, offerId);
  if (listing) {
    return (
      <PageContainer width="wide">
        <PropertyListingDetailActions business={business} listing={listing} requestId={need} />
      </PageContainer>
    );
  }

  notFound();
}
