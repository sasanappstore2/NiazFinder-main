import localFont from 'next/font/local';
import { Geist_Mono } from 'next/font/google';

/** Persian UI — variable weight 100–900 (self-hosted WOFF2). */
export const vazirmatn = localFont({
  src: '../../../public/fonts/vazirmatn/vazirmatn-arabic-wght-normal.woff2',
  variable: '--font-vazirmatn',
  weight: '100 900',
  display: 'swap',
  preload: true,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});

/** Latin mono for OTP, codes, charts. */
export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});
