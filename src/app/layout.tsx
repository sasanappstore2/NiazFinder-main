import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

// ============================
// Font Configuration
// ============================
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ============================
// SEO Metadata
// ============================
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://needfinder.ir";
const SITE_NAME = "نیاز فایندر";
const SITE_DESCRIPTION =
  "نیاز خود را ثبت کنید، بهترین متخصص‌ها را پیدا کنید. پلتفرم هوشمند اتصال کارفرمایان به متخصصان حرفه‌ای در تمامی حوزه‌ها.";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - پیدا کردن بهترین متخصص‌ها`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "نیاز فایندر",
    "متخصص",
    "پروژه",
    "فریلنسر",
    "خدمات",
    "کارفرما",
    "ثبت نیاز",
    "طراحی سایت",
    "برنامه‌نویسی",
    "تعمیرات",
    "ایران",
  ],
  authors: [{ name: "NeedFinder Team", url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),

  // Icons
  icons: {
    icon: [
      { url: "/logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },

  // Robots
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

  // OpenGraph
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "fa_IR",
    alternateLocale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: "@needfinder_ir",
    site: "@needfinder_ir",
  },

  // Alternates (languages)
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fa-IR": SITE_URL,
      "en-US": `${SITE_URL}/en`,
    },
  },

  // Format Detection
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },

  // Verification (placeholder)
  verification: {
    google: "your-google-verification-code",
  },

  // Category
  category: "marketplace",
};

// Viewport configuration (Next.js 14+ separate export)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// ============================
// Root Layout
// ============================
export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* JSON-LD Structured Data */}
        <JsonLdScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {/* Main Content */}
          {children}

          {/* Parallel Route: Modal Slot */}
          {modal}

          {/* Toast Notifications */}
          <Toaster
            position="top-center"
            richColors
            dir="rtl"
            toastOptions={{
              className: "!font-sans",
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
