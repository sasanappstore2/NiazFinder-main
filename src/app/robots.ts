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
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications", "/dev"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications", "/dev"],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/messages", "/notifications", "/dev"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
        disallow: ["/api/", "/dev"],
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
        disallow: ["/api/", "/dev"],
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
        disallow: ["/api/", "/dev"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dev"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
