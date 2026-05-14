import type { MetadataRoute } from "next";
import { SITE_URL, SEO_ROUTES, CATEGORY_ROUTES } from "@/lib/seo";

/**
 * Dynamic Sitemap Generator
 * Generates XML sitemap for all virtual routes
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Main SEO routes (virtual SPA pages)
  const mainRoutes = SEO_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency as "daily" | "weekly" | "monthly" | "yearly",
    priority: route.priority,
  }));

  // Category routes (service categories)
  const categoryRoutes = CATEGORY_ROUTES.map((cat, index) => ({
    url: `${SITE_URL}/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: cat.parentSlug ? 0.5 : 0.7,
  }));

  // City pages (major Iranian cities)
  const cities = [
    "tehran", "isfahan", "shiraz", "tabriz", "mashhad", "ahvaz", "karaj", "qom",
    "kermanshah", "urmia", "rasht", "zahedan", "hamedan", "kerman", "yazd",
    "ardabil", "bandar-abbas", "arak", "sanandaj", "qazvin", "zanjan", "gorgan",
    "sari", "bushehr", "bojnourd",
  ];

  const cityRoutes = cities.map((city) => ({
    url: `${SITE_URL}/${city}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.4,
  }));

  return [...mainRoutes, ...categoryRoutes, ...cityRoutes];
}
