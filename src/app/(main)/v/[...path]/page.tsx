import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Separator } from '@/components/ui/separator';
import { RequestDetail } from '@/components/need/RequestDetail';
import { db } from '@/lib/db';
import { routeBuilder } from '@/config/routes';
import { slugifyTitle, isCanonicalSlug } from '@/lib/seo/slug';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

async function lookupTitle(id: string): Promise<string | null> {
  const row = await db.serviceRequest.findUnique({
    where: { id },
    select: { title: true },
  });
  return row?.title ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const id = path.length >= 2 ? path[1] : path[0];
  const title = await lookupTitle(decodeURIComponent(id));

  if (!title) {
    return { title: `آگهی | ${SITE_NAME}` };
  }

  const slug = slugifyTitle(title);
  const canonical = routeBuilder.listing(id, title);
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description: `جزئیات آگهی «${title}» در ${SITE_NAME}.`,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description: `جزئیات آگهی «${title}» در ${SITE_NAME}.`,
      url: `${SITE_URL}${canonical}`,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title: fullTitle },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { path } = await params;

  if (path.length > 2) notFound();

  if (path.length === 1) {
    const id = decodeURIComponent(path[0]);
    const title = await lookupTitle(id);
    if (!title) notFound();
    permanentRedirect(routeBuilder.listing(id, title));
  }

  const [rawSlug, rawId] = path;
  const id = decodeURIComponent(rawId);
  const title = await lookupTitle(id);
  if (!title) notFound();

  if (!isCanonicalSlug(rawSlug, title)) {
    permanentRedirect(routeBuilder.listing(id, title));
  }

  const slug = slugifyTitle(title);
  const canonical = routeBuilder.listing(id, title);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'بازار نیازها', item: `${SITE_URL}/n/iran` },
      { '@type': 'ListItem', position: 3, name: title, item: `${SITE_URL}${canonical}` },
    ],
  };

  return (
    <>
      <JsonLd id="listing-breadcrumb-jsonld" data={jsonLd} />
      <PageContainer width="wide" className="max-lg:pb-4">
        <Breadcrumb />
        <Separator className="my-4" />
        <RequestDetail id={id} />
      </PageContainer>
    </>
  );
}
