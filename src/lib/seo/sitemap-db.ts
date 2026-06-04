import { db } from '@/lib/db';
import { routeBuilder } from '@/config/routes';
import type { SitemapEntry } from '@/lib/seo/sitemap';
import { DEFAULT_CHANGEFREQ, DEFAULT_PRIORITY } from '@/lib/seo/sitemap';
import { SITE_URL } from '@/lib/constants';

const BATCH = 500;

export async function fetchPublishedOfferEntries(): Promise<SitemapEntry[]> {
  const offers = await db.businessOffer.findMany({
    where: { isPublished: true, profile: { status: 'ACTIVE' } },
    select: {
      id: true,
      updatedAt: true,
      profile: { select: { slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  return offers.map((o) => ({
    url: `${SITE_URL}${routeBuilder.businessProduct(o.profile.slug, o.id)}`,
    lastModified: o.updatedAt.toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}

export async function fetchOpenRequestEntries(): Promise<SitemapEntry[]> {
  const requests = await db.serviceRequest.findMany({
    where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  return requests.map((r) => {
    return {
      url: `${SITE_URL}${routeBuilder.listing(r.id, r.title)}`,
      lastModified: r.updatedAt.toISOString(),
      changeFrequency: 'daily',
      priority: 0.85,
    };
  });
}

/** Aggregate static + marketplace + DB-backed URLs for sitemap.xml. */
export async function buildFullSitemapFromDb(): Promise<SitemapEntry[]> {
  const { generateFullSitemap } = await import('@/lib/seo/sitemap');

  const profileEntries: SitemapEntry[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const batch = await db.businessProfile.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    for (const r of batch) {
      profileEntries.push({
        url: `${SITE_URL}${routeBuilder.businessProfile(r.slug)}`,
        lastModified: r.updatedAt.toISOString(),
        changeFrequency: DEFAULT_CHANGEFREQ,
        priority: DEFAULT_PRIORITY,
      });
    }
    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH) break;
  }

  const [offerEntries, requestEntries] = await Promise.all([
    fetchPublishedOfferEntries(),
    fetchOpenRequestEntries(),
  ]);

  return [
    ...generateFullSitemap(),
    ...profileEntries,
    ...offerEntries,
    ...requestEntries,
  ];
}
