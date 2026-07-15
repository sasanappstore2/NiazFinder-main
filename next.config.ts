import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/security/content-security-policy";
import {
  logAllowedDevOriginsIfConfigured,
  parseAllowedDevOrigins,
} from "./src/lib/dev/allowed-dev-origins";

logAllowedDevOriginsIfConfigured();

/**
 * Legacy → canonical 301 redirects.
 *
 * Canonical surface:
 *   /n/iran, /n/{city}              — needs marketplace
 *   /b/iran, /b/{city}              — businesses marketplace
 *   /v/{slug}/{id}                  — listing detail
 *   /b/{profileSlug}                — business profile
 *   /pro/{id}                       — 301 to /b/{slug} (middleware)
 */
const legacyRedirects = [
  { source: "/browse",                    destination: "/n/iran",                permanent: true },
  { source: "/browse-requests",           destination: "/n/iran",                permanent: true },
  { source: "/browse-requests/:path*",    destination: "/n/iran",                permanent: true },
  { source: "/browse-specialists",        destination: "/b/iran",                permanent: true },
  { source: "/browse-specialists/:path*", destination: "/b/iran",                permanent: true },

  { source: "/requests",                  destination: "/n/iran",                permanent: true },
  { source: "/requests/new",              destination: "/post",                  permanent: true },
  { source: "/requests/:slug",            destination: "/v/:slug",               permanent: true },
  { source: "/specialists",               destination: "/b/iran",                permanent: true },
  { source: "/specialists/:id",           destination: "/pro/:id",               permanent: true },
  { source: "/specialists/compare",       destination: "/b/iran",                permanent: true },

  { source: "/need",                      destination: "/n/iran",                permanent: true },
  { source: "/need/new",                  destination: "/post",                  permanent: true },
  { source: "/business",                  destination: "/b/iran",                permanent: true },
  { source: "/business/compare",          destination: "/b/iran",                permanent: true },
  { source: "/post-need",                 destination: "/post",                  permanent: true },
  { source: "/v2",                        destination: "/post",                  permanent: false },
  { source: "/v2/:path*",                 destination: "/post",                  permanent: false },
  { source: "/request/:id",               destination: "/v/:id",                 permanent: true },
  { source: "/request-detail/:id",        destination: "/v/:id",                 permanent: true },
  { source: "/specialist/:id",            destination: "/pro/:id",               permanent: true },
  { source: "/specialist-profile/:id",    destination: "/pro/:id",               permanent: true },
  { source: "/compare-specialists",       destination: "/b/iran",                permanent: true },

  { source: "/messages",                  destination: "/chat",                  permanent: true },
  { source: "/messages/:path*",           destination: "/chat/:path*",           permanent: true },

  { source: "/support",                   destination: "/help",                  permanent: true },

  { source: "/guide",                     destination: "/help",                  permanent: true },
  { source: "/category/:slug",            destination: "/n/iran/:slug",          permanent: true },
  { source: "/pricing/:plan",             destination: "/pricing",                 permanent: true },
] as const;

function buildMinioRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const raw = process.env.MINIO_PUBLIC_URL?.trim();
  if (!raw) return [];

  try {
    const url = new URL(raw);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    return [
      {
        protocol,
        hostname: url.hostname,
        pathname: "/**",
        ...(url.port ? { port: url.port } : {}),
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: parseAllowedDevOrigins(),
  // Runtime fs reads (rag/knowledge-index, intake rules packs, map tile caches)
  // make the tracer pull huge repo trees into .next/standalone. These paths
  // live on the server disk at runtime — exclude them from the traced output.
  outputFileTracingExcludes: {
    "*": [
      "./OBISIDIAN/**",
      "./docs/**",
      // Runtime caches/crawl corpora — recreated on demand; deploys that want
      // geo analytics must copy data/GeoLite2-City.mmdb next to the server.
      "./data/**",
      "./reports/**",
      "./mini-services/**",
      "./Scrapegraph-ai-main/**",
      "./archive/**",
      "./src/intake.backup.20260711/**",
      "./src/components/need-intake.backup.20260711/**",
    ],
  },
  async headers() {
    const commonHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(self), geolocation=(self)",
      },
    ];

    // CSP breaks React/Turbopack dev (requires eval). Enforce only in production.
    if (process.env.NODE_ENV === "production") {
      commonHeaders.push({
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(),
      });
    }

    return [
      {
        source: "/:path*",
        headers: commonHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...buildMinioRemotePatterns(),
      // Filing portal listing images (maskanyaban and similar)
      { protocol: "https", hostname: "maskanyaban.ir", pathname: "/**" },
      { protocol: "https", hostname: "www.maskanyaban.ir", pathname: "/**" },
      { protocol: "https", hostname: "showmelk.ir", pathname: "/**" },
      { protocol: "https", hostname: "www.showmelk.ir", pathname: "/**" },
    ],
    // ProgressiveImage uses 20 (placeholder) and 86 (full); ProductDetailGallery uses 78.
    qualities: [20, 75, 78, 86],
  },
  async redirects() {
    return [...legacyRedirects];
  },
};

export default nextConfig;
