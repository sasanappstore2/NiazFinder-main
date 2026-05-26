import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Separator } from '@/components/ui/separator';
import { UniversalBusinessProfile } from '@/components/business-profile';
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
      <PageContainer width="wide">
        <Breadcrumb />
        <Separator className="my-4" />
        <UniversalBusinessProfile businessId={business.id} />
      </PageContainer>
    </>
  );
}
