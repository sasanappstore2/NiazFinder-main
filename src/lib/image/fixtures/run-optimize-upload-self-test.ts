/**
 * Run: npx --yes tsx src/lib/image/fixtures/run-optimize-upload-self-test.ts
 */
import sharp from 'sharp';
import { optimizeUploadBuffer } from '../optimize-upload';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

async function main() {
  const largeJpeg = await sharp({
    create: {
      width: 2400,
      height: 1800,
      channels: 3,
      noise: { type: 'gaussian', sigma: 30 },
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg({ quality: 98 })
    .toBuffer();

  assert(largeJpeg.length > 50_000, 'fixture jpeg is large enough');

  const product = await optimizeUploadBuffer(largeJpeg, 'product', 'image/jpeg');
  assert(product.mime === 'image/webp', 'product mime webp');
  assert(product.extension === '.webp', 'product ext webp');
  assert(product.bytesAfter < product.bytesBefore, 'product smaller');
  assert(product.optimized, 'product optimized flag');

  const meta = await sharp(product.buffer).metadata();
  assert((meta.width ?? 0) <= 1920, 'product width capped');
  assert((meta.height ?? 0) <= 1920, 'product height capped');

  const logo = await optimizeUploadBuffer(largeJpeg, 'logo', 'image/jpeg');
  const logoMeta = await sharp(logo.buffer).metadata();
  assert((logoMeta.width ?? 0) <= 512, 'logo width capped');
  assert((logoMeta.height ?? 0) <= 512, 'logo height capped');

  const pngAlpha = await sharp({
    create: {
      width: 800,
      height: 800,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();

  const logoAlpha = await optimizeUploadBuffer(pngAlpha, 'logo', 'image/png');
  assert(logoAlpha.mime === 'image/webp', 'png alpha -> webp');
  const alphaMeta = await sharp(logoAlpha.buffer).metadata();
  assert(alphaMeta.hasAlpha === true, 'alpha preserved');

  if (failed > 0) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log('OK: optimize-upload self-test');
  console.log(
    `  sample ${(largeJpeg.length / 1024).toFixed(0)}KB -> ${(product.bytesAfter / 1024).toFixed(0)}KB (product)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
