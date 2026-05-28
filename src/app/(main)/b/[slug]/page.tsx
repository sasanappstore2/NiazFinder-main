import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Separator } from '@/components/ui/separator';
import { UniversalBusinessProfile } from '@/components/business-profile';
import {
  generateSearchMarketplaceMetadata,
  SearchMarketplacePage,
} from '@/components/browse/SearchMarketplacePage';
import { isMarketplaceLocationSegment } from '@/config/market-routes';
import { routeBuilder } from '@/config/routes';
import {
  loadBusinessByProfileSlug,
  loadBusinessByUserId,
  incrementBusinessView,
} from '@/lib/business/load-profile';
import { buildLocalBusinessJsonLd } from '@/lib/seo/business-json-ld';
import { SITE_NAME } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveBusiness(slug: string) {
  const bySlug = await loadBusinessByProfileSlug(slug);
  if (bySlug) return bySlug;
  return loadBusinessByUserId(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isMarketplaceLocationSegment(slug)) {
    return generateSearchMarketplaceMetadata({
      params: Promise.resolve({ location: slug }),
      market: 'business',
    });
  }

  const business = await resolveBusiness(slug);
  if (!business) return { title: `کسب‌وکار | ${SITE_NAME}` };

  return {
    title: business.seo.title,
    description: business.seo.description,
    keywords: business.seo.keywords,
    alternates: { canonical: routeBuilder.businessProfile(business.slug) },
    openGraph: {
      title: business.seo.title,
      description: business.seo.description,
      type: 'profile',
    },
  };
}

export default async function BusinessSlugPage({ params }: PageProps) {
  const { slug } = await params;

  if (isMarketplaceLocationSegment(slug)) {
    return SearchMarketplacePage({
      params: Promise.resolve({ location: slug }),
      market: 'business',
    });
  }

  const business = await resolveBusiness(slug);
  if (!business) notFound();

  if (business.slug && slug !== business.slug) {
    permanentRedirect(routeBuilder.businessProfile(business.slug));
  }

  await incrementBusinessView(business.userId);
  const jsonLd = buildLocalBusinessJsonLd(business);

  return (
    <>
      <JsonLd id="business-jsonld" data={jsonLd} />
      <PageContainer width="wide">
        <Breadcrumb businessProfileLabel={business.name} />
        <Separator className="my-3 sm:my-4" />
        <UniversalBusinessProfile businessId={business.userId} />
      </PageContainer>
    </>
  );
}
