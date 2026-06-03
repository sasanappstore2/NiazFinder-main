import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Separator } from '@/components/ui/separator';
import { BusinessProfileAuraScope, UniversalBusinessProfile } from '@/components/business-profile';
import { loadBusinessBySlug } from '@/lib/business/load-profile';
import { buildLocalBusinessJsonLd } from '@/lib/seo/business-json-ld';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { routeBuilder } from '@/config/routes';
import { incrementBusinessView } from '@/lib/business/load-profile';

interface PageProps {
  params: Promise<{ city: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, category, slug } = await params;
  const business = await loadBusinessBySlug(city, category, slug);
  if (!business) return { title: `کسب‌وکار | ${SITE_NAME}` };

  const path = routeBuilder.businessSeo(city, category, slug);
  return {
    title: business.seo.title,
    description: business.seo.description,
    keywords: business.seo.keywords,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title: business.seo.title,
      description: business.seo.description,
      url: `${SITE_URL}${path}`,
      type: 'profile',
    },
  };
}

export default async function BusinessSeoPage({ params }: PageProps) {
  const { city, category, slug } = await params;
  const business = await loadBusinessBySlug(city, category, slug);

  if (!business) notFound();

  await incrementBusinessView(business.id);
  const jsonLd = buildLocalBusinessJsonLd(business);

  return (
    <>
      <JsonLd id="business-seo-jsonld" data={jsonLd} />
      <BusinessProfileAuraScope logoUrl={business.identity.logo}>
        <PageContainer
          width="wide"
          noVerticalPadding
          className="relative bg-transparent pb-12 sm:pb-14"
        >
          <div className="profile-surface rounded-xl px-3 py-2">
            <Breadcrumb />
          </div>
          <Separator className="my-4 bg-border/35" />
          <UniversalBusinessProfile businessId={business.id} />
        </PageContainer>
      </BusinessProfileAuraScope>
    </>
  );
}
