import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Robots.txt Configuration
 * Optimized for Persian SEO with comprehensive directives
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications"],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
