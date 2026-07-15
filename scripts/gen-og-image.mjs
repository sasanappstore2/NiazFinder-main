// Generate public/og-image.png (1200x630) — brand tile with logo + Persian tagline.
// Run: node scripts/gen-og-image.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pub = join(root, 'public');
const logoSvg = readFileSync(join(pub, 'logo.svg'));

const W = 1200;
const H = 630;

// Soft radial glow over the brand green, matching the site's hero gradient.
const bgSvg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#047857"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.1" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="50%" y="430" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif"
        font-size="72" font-weight="700" fill="#ffffff">نیاز فایندر</text>
  <text x="50%" y="510" text-anchor="middle" font-family="Vazirmatn, Tahoma, sans-serif"
        font-size="34" font-weight="400" fill="#d1fae5">پلتفرم هوشمند اتصال نیاز به کسب‌وکار</text>
</svg>`);

const logo = await sharp(logoSvg, { density: 384 })
  .resize(220, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(bgSvg)
  .composite([{ input: logo, top: 90, left: Math.round((W - 220) / 2) }])
  .png()
  .toFile(join(pub, 'og-image.png'));

console.log('wrote og-image.png 1200x630');
