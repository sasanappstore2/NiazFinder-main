import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { buildContentSecurityPolicy } from "./src/lib/security/content-security-policy";
import {
  logAllowedDevOriginsIfConfigured,
  parseAllowedDevOrigins,
} from "./src/lib/dev/allowed-dev-origins";

logAllowedDevOriginsIfConfigured();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingExcludes: {
    "*": [
      "./mini-services/**",
      "./scripts/**",
      "./docs/**",
      "./OBISIDIAN/**",
      "./openclaw/**",
      "./examples/**",
    ],
  },
  allowedDevOrigins: parseAllowedDevOrigins(),
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-accordion",
      "@radix-ui/react-checkbox",
      "react-map-gl",
      "date-fns",
      "sonner",
      "@tanstack/react-query",
      "zod",
      "recharts",
      "maplibre-gl",
      "@ark-ui/react",
      "socket.io-client",
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
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icon-192.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icon-512.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: commonHeaders,
      },
    ];
  },
  images: {
    remotePatterns: buildMinioRemotePatterns(),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // ProgressiveImage uses 20 (placeholder) and 86 (full); ProductDetailGallery uses 78.
    qualities: [20, 75, 78, 86],
  },
  async redirects() {
    return [...legacyRedirects];
  },
};

export default withBundleAnalyzer(nextConfig);
