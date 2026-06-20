import type { Metadata, Viewport } from "next";
import "./globals.css";
import { vazirmatn } from "@/lib/fonts/vazirmatn";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { GlobalVoiceCallLayer } from "@/components/voice/GlobalVoiceCallLayer";
import { DeferredChatSocketBootstrap } from "@/components/voice/DeferredChatSocketBootstrap";
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  generateHomepageStructuredData,
  combineJsonLd,
} from "@/lib/seo";
import { FAQ_DATA } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════════
// Viewport Configuration
// ═══════════════════════════════════════════════════════════════════
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#047857" },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Metadata - Comprehensive SEO Optimization
// ═══════════════════════════════════════════════════════════════════
export const metadata: Metadata = {
  // ── Basic Meta ──
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: "NeedFinder Team", url: SITE_URL }],
  creator: "NeedFinder Team",
  publisher: "NeedFinder",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "marketplace",
  classification: "services marketplace",

  // ── Canonical URL ──
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fa-IR": SITE_URL,
    },
  },

  // ── Icons & Manifest ──
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",

  // ── Open Graph (Facebook, LinkedIn, etc.) ──
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - ${SITE_TAGLINE}`,
        type: "image/png",
      },
    ],
  },

  // ── Twitter Card ──
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@needfinder",
  },

  // ── Additional Meta ──
  metadataBase: new URL(SITE_URL),
  other: {
    "application-name": SITE_NAME,
    "apple-mobile-web-app-title": SITE_NAME,
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "format-detection": "telephone=yes",
    "mobile-web-app-capable": "yes",
  },

  // ── Verification (placeholders) ──
  verification: {
    google: "your-google-verification-code",
    other: {
      "msvalidate.01": "your-bing-verification-code",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// JSON-LD Structured Data
// ═══════════════════════════════════════════════════════════════════
const structuredData = generateHomepageStructuredData(FAQ_DATA);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        {structuredData.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema),
            }}
          />
        ))}

        {/* Additional structured data references */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@id": `${SITE_URL}/#organization`,
                },
                {
                  "@id": `${SITE_URL}/#website`,
                },
                {
                  "@id": `${SITE_URL}/#webpage`,
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground persian-nums`}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:inset-s-2 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          رفتن به محتوای اصلی
        </a>

        <ThemeProvider>
          {children}
          <DeferredChatSocketBootstrap />
          <GlobalVoiceCallLayer />
          <Toaster position="top-center" richColors dir="rtl" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
