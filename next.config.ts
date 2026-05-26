import type { NextConfig } from "next";

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
  { source: "/specialists/compare",       destination: "/compare",               permanent: true },

  { source: "/need",                      destination: "/n/iran",                permanent: true },
  { source: "/need/new",                  destination: "/post",                  permanent: true },
  { source: "/business",                  destination: "/b/iran",                permanent: true },
  { source: "/business/compare",          destination: "/compare",               permanent: true },
  { source: "/post-need",                 destination: "/post",                  permanent: true },
  { source: "/request/:id",               destination: "/v/:id",                 permanent: true },
  { source: "/request-detail/:id",        destination: "/v/:id",                 permanent: true },
  { source: "/specialist/:id",            destination: "/pro/:id",               permanent: true },
  { source: "/specialist-profile/:id",    destination: "/pro/:id",               permanent: true },
  { source: "/compare-specialists",       destination: "/compare",               permanent: true },

  { source: "/messages",                  destination: "/chat",                  permanent: true },
  { source: "/messages/:path*",           destination: "/chat/:path*",           permanent: true },

  { source: "/support",                   destination: "/help",                  permanent: true },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [...legacyRedirects];
  },
};

export default nextConfig;
