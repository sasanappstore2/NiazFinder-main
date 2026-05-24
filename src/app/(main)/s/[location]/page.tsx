import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { BrowseDispatcher } from '@/components/browse/BrowseDispatcher';
import {
  resolveSearchSegments,
  canonicalPath,
} from '@/lib/search/resolve-segments';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

interface PageProps {
  params: Promise<{ location: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location } = await params;
  const ctx = resolveSearchSegments(location, []);

  if (ctx.kind === 'invalid-location') {
    return { title: `جستجو | ${SITE_NAME}` };
  }

  const where = ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;
  const title = `آگهی‌ها در ${where} | ${SITE_NAME}`;
  const description =
    ctx.location.kind === 'country'
      ? `جدیدترین نیازها و کسب‌وکارها در سراسر ایران در ${SITE_NAME}.`
      : `جدیدترین نیازها و کسب‌وکارها در ${where} در ${SITE_NAME}.`;
  const path = canonicalPath(ctx);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SearchLocationPage({ params }: PageProps) {
  const { location } = await params;
  const ctx = resolveSearchSegments(location, []);

  if (ctx.kind === 'invalid-location') notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <BrowseDispatcher
        citySlug={ctx.location.kind === 'city' ? ctx.location.city.slug : undefined}
      />
    </div>
  );
}
