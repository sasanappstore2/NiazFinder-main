import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "نیاز فایندر - پیدا کردن بهترین متخصص‌ها",
  description: "نیاز خود را ثبت کنید، بهترین متخصص‌ها را پیدا کنید. پلتفرم هوشمند اتصال کارفرمایان به متخصصان حرفه‌ای در تمامی حوزه‌ها.",
  keywords: ["نیاز فایندر", "متخصص", "پروژه", "فریلنسر", "خدمات", "کارفرما", "ثبت نیاز"],
  authors: [{ name: "NeedFinder Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "نیاز فایندر",
    description: "پلتفرم هوشمند اتصال نیاز به متخصص",
    siteName: "نیاز فایندر",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
