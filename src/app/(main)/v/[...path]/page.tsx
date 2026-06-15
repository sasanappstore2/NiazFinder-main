import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeading } from '@/components/layout/PageHeading';
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

async function lookupTitle(id: string): Promise<{ title: string; publicVisible: boolean } | null> {
  const row = await db.serviceRequest.findUnique({
    where: { id },
    select: { title: true, moderationStatus: true, status: true },
  });
  if (!row?.title) return null;
  const publicVisible =
    row.moderationStatus === 'APPROVED' &&
    ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(row.status);
  return { title: row.title, publicVisible };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const id = path.length >= 2 ? path[1] : path[0];
  const lookup = await lookupTitle(decodeURIComponent(id));

  if (!lookup) {
    return { title: `آگهی | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  if (!lookup.publicVisible) {
    return {
      title: `آگهی | ${SITE_NAME}`,
      robots: { index: false, follow: false },
    };
  }

  const title = lookup.title;
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
    const lookup = await lookupTitle(id);
    if (!lookup) notFound();
    permanentRedirect(routeBuilder.listing(id, lookup.title));
  }

  const [rawSlug, rawId] = path;
  const id = decodeURIComponent(rawId);
  const lookup = await lookupTitle(id);
  if (!lookup) notFound();

  const title = lookup.title;
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
        <PageHeading title={title} visuallyHidden />
        <Separator className="my-4" />
        <RequestDetail id={id} />
      </PageContainer>
    </>
  );
}
