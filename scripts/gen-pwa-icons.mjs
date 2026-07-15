// Generate PWA raster icons from public/logo.svg.
// - icon-192 / icon-512        : branded tile (purpose "any")
// - icon-maskable-192 / -512   : logo within the 80% maskable safe zone
// - apple-touch-icon (180)     : opaque tile for iOS home screen
// Run: node scripts/gen-pwa-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pub = join(root, 'public');
const svg = readFileSync(join(pub, 'logo.svg'));
const BRAND = '#059669'; // emerald-600 — matches theme_color

async function tile(size, logoScale, name) {
  const logoPx = Math.round(size * logoScale);
  const logo = await sharp(svg, { density: 384 })
    .resize(logoPx, logoPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(pub, name));
  console.log('wrote', name, `${size}x${size}`);
}

await tile(192, 0.7, 'icon-192.png');
await tile(512, 0.7, 'icon-512.png');
await tile(192, 0.58, 'icon-maskable-192.png'); // logo inside 80% safe zone
await tile(512, 0.58, 'icon-maskable-512.png');
await tile(180, 0.74, 'apple-touch-icon.png'); // iOS, opaque
console.log('done');
