import localFont from 'next/font/local';

/** Persian UI — variable weight 100–900 (self-hosted WOFF2). */
export const vazirmatn = localFont({
  src: '../../../public/fonts/vazirmatn/vazirmatn-arabic-wght-normal.woff2',
  variable: '--font-vazirmatn',
  weight: '100 900',
  display: 'swap',
  // Preload: the hero text is the LCP on most pages — a late font swap both
  // delays LCP and shifts layout (fallback metrics differ from Vazirmatn).
  preload: true,
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});
