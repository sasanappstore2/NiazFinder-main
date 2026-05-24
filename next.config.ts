import type { NextConfig } from "next";

/**
 * Legacy → canonical 301 redirects.
 *
 * Canonical surface (Divar-inspired):
 *   /                      — home
 *   /s/iran                — search root (country-wide)
 *   /s/{city}              — city marketplace
 *   /s/{loc}/{cat}         — category
 *   /s/{loc}/{p}/{cat}     — nested category
 *   /v/{slug}/{id}         — listing detail (Divar /v/ parity)
 *   /pro/{id}              — business profile (Divar /pro/ parity)
 *   /post                  — post a need
 *   /chat                  — chat
 *   /help                  — support
 *
 * Notes
 *   - `/browse/...` static redirects can't differentiate `/browse/{city}/{cat}`
 *     from `/browse/{parent}/{cat}` (both look the same in a static rule), so
 *     the dynamic catch-all under `/browse/...` does that work via a server
 *     redirect in its page handler. The static rules below cover all the
 *     cases that a regex CAN unambiguously match.
 */
const legacyRedirects = [
  // Top-level browse (no segments) → canonical /s/iran
  { source: "/browse",                    destination: "/s/iran",                permanent: true },

  // Old type-prefixed browse roots
  { source: "/browse-requests",           destination: "/s/iran?type=need",      permanent: true },
  { source: "/browse-requests/:path*",    destination: "/s/iran?type=need",      permanent: true },
  { source: "/browse-specialists",        destination: "/s/iran?type=business",  permanent: true },
  { source: "/browse-specialists/:path*", destination: "/s/iran?type=business",  permanent: true },

  // Old taxonomy roots
  { source: "/requests",                  destination: "/s/iran?type=need",      permanent: true },
  { source: "/requests/new",              destination: "/post",                  permanent: true },
  { source: "/requests/:slug",            destination: "/n/:slug",               permanent: true },
  { source: "/specialists",               destination: "/s/iran?type=business",  permanent: true },
  { source: "/specialists/:id",           destination: "/b/:id",                 permanent: true },
  { source: "/specialists/compare",       destination: "/compare",               permanent: true },

  // Legacy aliases
  { source: "/need",                      destination: "/s/iran?type=need",      permanent: true },
  { source: "/need/new",                  destination: "/post",                  permanent: true },
  { source: "/business",                  destination: "/s/iran?type=business",  permanent: true },
  { source: "/business/compare",          destination: "/compare",               permanent: true },
  { source: "/post-need",                 destination: "/post",                  permanent: true },
  { source: "/request/:id",               destination: "/n/:id",                 permanent: true },
  { source: "/request-detail/:id",        destination: "/n/:id",                 permanent: true },
  { source: "/specialist/:id",            destination: "/b/:id",                 permanent: true },
  { source: "/specialist-profile/:id",    destination: "/b/:id",                 permanent: true },
  { source: "/compare-specialists",       destination: "/compare",               permanent: true },

  // Chat
  { source: "/messages",                  destination: "/chat",                  permanent: true },
  { source: "/messages/:path*",           destination: "/chat/:path*",           permanent: true },

  { source: "/n/:path*",               destination: "/v/:path*",              permanent: true },
  { source: "/b/:id",                   destination: "/pro/:id",               permanent: true },
  { source: "/b/:id/review",            destination: "/pro/:id/review",        permanent: true },
  { source: "/b/:id/invite",            destination: "/pro/:id/invite",        permanent: true },

  // Support
  { source: "/support",                   destination: "/help",                  permanent: true },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  async redirects() {
    return [...legacyRedirects];
  },
};

export default nextConfig;
