import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UniversalBusinessProfile } from '@/components/business-profile';
import { loadBusinessByUserId } from '@/lib/business/load-profile';
import { buildLocalBusinessJsonLd } from '@/lib/seo/business-json-ld';
import { SITE_NAME } from '@/lib/seo';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const business = await loadBusinessByUserId(id);
  if (!business) return { title: `کسب‌وکار | ${SITE_NAME}` };

  return {
    title: business.seo.title,
    description: business.seo.description,
    keywords: business.seo.keywords,
    alternates: { canonical: business.seo.canonicalUrl },
    openGraph: {
      title: business.seo.title,
      description: business.seo.description,
      type: 'profile',
    },
  };
}

export default async function ProProfilePage({ params }: PageProps) {
  const { id } = await params;
  const business = await loadBusinessByUserId(id);
  if (!business) notFound();

  const jsonLd = buildLocalBusinessJsonLd(business);

  return (
    <>
      <Script id="business-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(jsonLd)}
      </Script>
      <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
        <Breadcrumb />
        <Separator className="my-4" />
        <UniversalBusinessProfile businessId={id} />
      </div>
    </>
  );
}
