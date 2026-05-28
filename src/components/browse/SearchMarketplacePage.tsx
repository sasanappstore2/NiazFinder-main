import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { BrowseDispatcher } from '@/components/browse/BrowseDispatcher';
import {
  resolveSearchSegments,
  canonicalPath,
} from '@/lib/search/resolve-segments';
import {
  resolveBusinessSegments,
  canonicalBusinessPath,
} from '@/lib/search/resolve-business-segments';
import { getCategoryPath } from '@/config/categories';
import {
  type BrowseMarket,
  canonicalMarketPath,
  listingTypeFromMarket,
} from '@/config/market-routes';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import {
  buildBrowsePageH1,
  buildBrowsePageTitlesFromContext,
} from '@/lib/browse/page-heading';

interface PageProps {
  params: Promise<{ location: string; segments?: string[] }>;
  market: BrowseMarket;
}

function resolveMarketContext(market: BrowseMarket, location: string, segments: string[]) {
  if (market === 'business') {
    return { kind: 'business' as const, ctx: resolveBusinessSegments(location, segments) };
  }
  return { kind: 'need' as const, ctx: resolveSearchSegments(location, segments) };
}

export async function generateSearchMarketplaceMetadata(
  { params, market }: PageProps
): Promise<Metadata> {
  const { location, segments = [] } = await params;
  const resolved = resolveMarketContext(market, location, segments);

  if (resolved.kind === 'business') {
    const bctx = resolved.ctx;
    if (bctx.kind === 'invalid-location' || bctx.kind === 'invalid-segments') {
      return { title: `جستجو | ${SITE_NAME}` };
    }
    const path = canonicalBusinessPath(bctx);
    const listingType = listingTypeFromMarket(market) as BrowseListingType;
    const categoryTitle =
      bctx.kind === 'profile-category' ||
      bctx.kind === 'need-category' ||
      bctx.kind === 'parent-child'
        ? bctx.categoryTitle
        : null;
    const parentCategoryTitle =
      bctx.kind === 'parent-child' ? bctx.parentTitle : null;
    const locationLabel =
      bctx.location.kind === 'country' ? 'سراسر ایران' : bctx.location.city.title;
    const h1 = buildBrowsePageH1({
      listingType,
      locationLabel,
      categoryTitle,
      parentCategoryTitle,
    });
    const title = `${h1} | ${SITE_NAME}`;
    const description =
      categoryTitle != null
        ? `کسب‌وکارهای ${categoryTitle} در ${locationLabel} در ${SITE_NAME}.`
        : `کسب‌وکارها در ${locationLabel} در ${SITE_NAME}.`;
    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: { title, description, url: `${SITE_URL}${path}`, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
    };
  }

  const ctx = resolved.ctx;
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') {
    return { title: `جستجو | ${SITE_NAME}` };
  }

  const path = canonicalPath(ctx, market);
  const { title, description } = buildBrowsePageTitlesFromContext(
    ctx,
    SITE_NAME,
    listingTypeFromMarket(market) as BrowseListingType
  );

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

export async function SearchMarketplacePage({ params, market }: PageProps) {
  const { location, segments = [] } = await params;
  const resolved = resolveMarketContext(market, location, segments);

  if (resolved.kind === 'business') {
    const bctx = resolved.ctx;
    if (bctx.kind === 'invalid-location' || bctx.kind === 'invalid-segments') notFound();

    if (bctx.kind === 'need-category' && bctx.category.parentSlug) {
      const locSlug = bctx.location.kind === 'country' ? 'iran' : bctx.location.city.slug;
      permanentRedirect(
        canonicalMarketPath(market, locSlug, [bctx.category.parentSlug, bctx.category.slug])
      );
    }

    const where =
      bctx.location.kind === 'country' ? 'سراسر ایران' : bctx.location.city.title;
    const locSlug = bctx.location.kind === 'country' ? 'iran' : bctx.location.city.slug;
    const base = canonicalMarketPath(market, locSlug);

    const itemListElement: {
      '@type': 'ListItem';
      position: number;
      name: string;
      item: string;
    }[] = [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: where, item: `${SITE_URL}${base}` },
    ];

    if (
      bctx.kind === 'profile-category' ||
      bctx.kind === 'need-category' ||
      bctx.kind === 'parent-child'
    ) {
      const crumbs: { name: string; slug: string }[] = [];
      if (bctx.kind === 'parent-child') {
        crumbs.push({ name: bctx.parentTitle, slug: bctx.parentSlug });
      }
      crumbs.push({ name: bctx.categoryTitle, slug: bctx.categorySlug });
      let pos = itemListElement.length + 1;
      let acc = `${SITE_URL}${base}`;
      for (const c of crumbs) {
        acc = `${acc}/${c.slug}`;
        itemListElement.push({
          '@type': 'ListItem',
          position: pos++,
          name: c.name,
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
      bctx.kind === 'profile-category' ||
      bctx.kind === 'need-category' ||
      bctx.kind === 'parent-child'
        ? bctx.categorySlug
        : undefined;
    const citySlug = bctx.location.kind === 'city' ? bctx.location.city.slug : undefined;

    return (
      <>
        <JsonLd id="search-breadcrumb-jsonld" data={breadcrumbJsonLd} />
        <PageContainer noVerticalPadding className="pt-2 pb-0">
          <Breadcrumb />
          <Separator className="my-4" />
        </PageContainer>
        <BrowseDispatcher market={market} categorySlug={categorySlug} citySlug={citySlug} />
      </>
    );
  }

  const ctx = resolved.ctx;
  if (ctx.kind === 'invalid-location' || ctx.kind === 'invalid-segments') notFound();

  if (ctx.kind === 'category' && ctx.category.parentSlug) {
    const parentSlug = ctx.category.parentSlug;
    const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
    permanentRedirect(canonicalMarketPath(market, locSlug, [parentSlug, ctx.category.slug]));
  }

  const where = ctx.location.kind === 'country' ? 'سراسر ایران' : ctx.location.city.title;
  const locSlug = ctx.location.kind === 'country' ? 'iran' : ctx.location.city.slug;
  const base = canonicalMarketPath(market, locSlug);

  const itemListElement: { '@type': 'ListItem'; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: where, item: `${SITE_URL}${base}` },
  ];
  if (ctx.kind === 'category' || ctx.kind === 'parent-child') {
    const chain = getCategoryPath(ctx.category.slug);
    let pos = itemListElement.length + 1;
    let acc = `${SITE_URL}${base}`;
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
      <JsonLd id="search-breadcrumb-jsonld" data={breadcrumbJsonLd} />
      <PageContainer noVerticalPadding className="pt-2 pb-0">
        <Breadcrumb />
        <Separator className="my-4" />
      </PageContainer>
      <BrowseDispatcher market={market} categorySlug={categorySlug} citySlug={citySlug} />
    </>
  );
}
