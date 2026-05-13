import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

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

const SITE_NAME = "نیاز فایندر";
const SITE_DESCRIPTION = "نیاز خود را ثبت کنید، بهترین متخصص‌ها را پیدا کنید. پلتفرم هوشمند اتصال کارفرمایان به متخصصان حرفه‌ای در تمامی حوزه‌ها.";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - پیدا کردن بهترین متخصص‌ها`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["نیاز فایندر", "متخصص", "پروژه", "فریلنسر", "خدمات", "کارفرما", "ثبت نیاز"],
  authors: [{ name: "NeedFinder Team" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <JsonLdScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors dir="rtl" />
        </ThemeProvider>
      </body>
    </html>
  );
}
