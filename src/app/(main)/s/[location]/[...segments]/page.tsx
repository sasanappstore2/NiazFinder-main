import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Script from 'next/script';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { BrowseDispatcher } from '@/components/browse/BrowseDispatcher';
import {
  resolveSearchSegments,
  canonicalPath,
} from '@/lib/search/resolve-segments';
import { getCategoryPath } from '@/config/categories';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

interface PageProps {
  params: Promise<{ location: string; segments: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { location, segments } = await params;
  const ctx = resolveSearchSegments(location, segments);

  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    return { title: `جستجو | ${SITE_NAME}` };
  }

  const where = ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;
  const path = canonicalPath(ctx);

  let title: string;
  let description: string;

  if (ctx.kind === 'all') {
    title = `آگهی‌ها در ${where} | ${SITE_NAME}`;
    description = `جدیدترین نیازها و کسب‌وکارها در ${where} در ${SITE_NAME}.`;
  } else if (ctx.kind === 'category') {
    title = `${ctx.category.title} در ${where} | ${SITE_NAME}`;
    description = `نیازها و کسب‌وکارهای ${ctx.category.title} در ${where} در ${SITE_NAME}.`;
  } else {
    title = `${ctx.category.title} | ${ctx.parent.title} در ${where} | ${SITE_NAME}`;
    description = `${ctx.category.title} در ${where} — زیرمجموعه ${ctx.parent.title} در ${SITE_NAME}.`;
  }

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

export default async function SearchSegmentsPage({ params }: PageProps) {
  const { location, segments } = await params;
  const ctx = resolveSearchSegments(location, segments);

  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') notFound();

  // If user lands on /s/{loc}/{cat} but cat is actually a leaf with a parent,
  // permanently redirect to the canonical /s/{loc}/{parent}/{cat} form.
  if (ctx.kind === 'category' && ctx.category.parentSlug) {
    const parentSlug = ctx.category.parentSlug;
    const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
    const canonical = `/s/${locSlug}/${parentSlug}/${ctx.category.slug}`;
    permanentRedirect(canonical);
  }

  // Build BreadcrumbList JSON-LD for rich results.
  const where = ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;
  const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
  const itemListElement: { '@type': 'ListItem'; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: where, item: `${SITE_URL}/s/${locSlug}` },
  ];
  if (ctx.kind === 'category' || ctx.kind === 'parent-child') {
    const chain = getCategoryPath(ctx.category.slug);
    let pos = itemListElement.length + 1;
    let acc = `${SITE_URL}/s/${locSlug}`;
    for (const node of chain) {
      acc = `${acc}/${node.slug}`;
      itemListElement.push({
        '@type': 'ListItem',
        position: pos++,
        name: node.title,
        item: acc,
      });
    }
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  const categorySlug =
    ctx.kind === 'category' || ctx.kind === 'parent-child' ? ctx.category.slug : undefined;
  const citySlug = ctx.location.kind === 'city' ? ctx.location.city.slug : undefined;

  return (
    <>
      <Script
        id="search-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
        <Breadcrumb />
        <Separator className="my-4" />
        <BrowseDispatcher categorySlug={categorySlug} citySlug={citySlug} />
      </div>
    </>
  );
}
