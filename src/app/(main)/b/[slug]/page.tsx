import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeading } from '@/components/layout/PageHeading';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BusinessProfileAuraScope, UniversalBusinessProfile } from '@/components/business-profile';
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

async function resolveBusiness(slug: string) {
  const bySlug = await loadBusinessByProfileSlug(slug);
  if (bySlug) return bySlug;
  return loadBusinessByUserId(slug);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isMarketplaceLocationSegment(slug)) {
    return generateSearchMarketplaceMetadata({
      params: Promise.resolve({ location: slug }),
      searchParams,
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

export default async function BusinessSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;

  if (isMarketplaceLocationSegment(slug)) {
    return SearchMarketplacePage({
      params: Promise.resolve({ location: slug }),
      searchParams,
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
      <BusinessProfileAuraScope logoUrl={business.identity.logo}>
        <PageContainer
          width="wide"
          noVerticalPadding
          className="relative bg-transparent pb-12 sm:pb-14"
        >
          <div className="overflow-guard min-w-0 py-3 sm:py-4">
            <Breadcrumb businessProfileLabel={business.name} />
            <PageHeading title={business.name} visuallyHidden />
          </div>
          <Separator className="my-4 bg-border/35 sm:my-5" />
          <Suspense
            fallback={
              <div className="space-y-6">
                <Skeleton className="h-56 w-full rounded-2xl" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            }
          >
            <UniversalBusinessProfile businessId={business.userId} />
          </Suspense>
        </PageContainer>
      </BusinessProfileAuraScope>
    </>
  );
}
