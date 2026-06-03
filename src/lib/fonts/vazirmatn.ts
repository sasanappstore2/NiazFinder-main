import localFont from 'next/font/local';

/** Persian UI — variable weight 100–900 (self-hosted WOFF2). */
export const vazirmatn = localFont({
  src: '../../../public/fonts/vazirmatn/vazirmatn-arabic-wght-normal.woff2',
  variable: '--font-vazirmatn',
  weight: '100 900',
  display: 'swap',
  preload: true,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});
