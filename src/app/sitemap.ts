import type { MetadataRoute } from 'next';
import { buildFullSitemapFromDb } from '@/lib/seo/sitemap-db';

/** Dynamic sitemap — static routes + approved marketplace listings from DB. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await buildFullSitemapFromDb();
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified ? new Date(entry.lastModified) : new Date(),
    changeFrequency: entry.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: entry.priority,
  }));
}
