import type { MetadataRoute } from "next";
import { SITE_URL, SEO_ROUTES } from "@/lib/seo";
import {
  generateStaticSitemapEntries,
  generateCitySitemapEntries,
  generateCategorySitemapEntries,
} from "@/lib/seo/sitemap";

/**
 * Dynamic sitemap — canonical marketplace URLs only.
 * See `src/lib/seo/sitemap.ts` for URL patterns.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const seen = new Set<string>();
  const merged: MetadataRoute.Sitemap = [];

  const push = (
    url: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number
  ) => {
    if (seen.has(url)) return;
    seen.add(url);
    merged.push({ url, lastModified: now, changeFrequency, priority });
  };

  for (const entry of [
    ...generateStaticSitemapEntries(),
    ...generateCitySitemapEntries(),
    ...generateCategorySitemapEntries(),
  ]) {
    push(
      entry.url,
      entry.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
      entry.priority
    );
  }

  for (const route of SEO_ROUTES) {
    push(
      `${SITE_URL}${route.path}`,
      route.changeFrequency,
      route.priority
    );
  }

  push(`${SITE_URL}/privacy`, "yearly", 0.4);

  return merged;
}
