/**
 * Replace external demo media URLs (e.g. picsum.photos) with local placeholders.
 * Run: npx tsx scripts/fix-external-media-urls.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLACEHOLDERS = [
  '/images/placeholders/demo-1.webp',
  '/images/placeholders/demo-2.webp',
  '/images/placeholders/demo-3.webp',
  '/images/placeholders/demo-4.webp',
];

function isExternalMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) return false;
  if (t.includes('picsum.photos') || t.includes('cloudinary.com') || t.includes('githubusercontent.com')) {
    return true;
  }
  return false;
}

function mapUrl(url: string, index: number): string {
  if (!isExternalMediaUrl(url)) return url;
  return PLACEHOLDERS[index % PLACEHOLDERS.length];
}

function mapJsonStringArray(raw: string, label: string): { next: string; changed: boolean } {
  let arr: string[];
  try {
    arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return { next: raw, changed: false };
  } catch {
    return { next: raw, changed: false };
  }

  let changed = false;
  const mapped = arr.map((u, i) => {
    const next = mapUrl(String(u), i);
    if (next !== u) changed = true;
    return next;
  });

  if (!changed) return { next: raw, changed: false };
  console.log(`  ${label}: ${arr.length} URL(s) updated`);
  return { next: JSON.stringify(mapped), changed: true };
}

async function main() {
  let total = 0;

  const offers = await prisma.businessOffer.findMany({ select: { id: true, images: true } });
  for (const row of offers) {
    const { next, changed } = mapJsonStringArray(row.images, `offer ${row.id}`);
    if (changed) {
      await prisma.businessOffer.update({ where: { id: row.id }, data: { images: next } });
      total += 1;
    }
  }

  const portfolio = await prisma.businessPortfolioItem.findMany({
    select: { id: true, mediaUrl: true, metadata: true },
  });
  for (const row of portfolio) {
    let mediaUrl = row.mediaUrl;
    let metadata = row.metadata;
    let changed = false;

    if (isExternalMediaUrl(mediaUrl)) {
      mediaUrl = mapUrl(mediaUrl, 0);
      changed = true;
    }

    try {
      const meta = JSON.parse(row.metadata) as Record<string, unknown>;
      for (const key of ['beforeUrl', 'afterUrl'] as const) {
        const v = meta[key];
        if (typeof v === 'string' && isExternalMediaUrl(v)) {
          meta[key] = mapUrl(v, key === 'beforeUrl' ? 1 : 2);
          changed = true;
        }
      }
      if (changed) metadata = JSON.stringify(meta);
    } catch {
      /* keep metadata */
    }

    if (changed) {
      await prisma.businessPortfolioItem.update({
        where: { id: row.id },
        data: { mediaUrl, metadata },
      });
      console.log(`  portfolio ${row.id}: updated`);
      total += 1;
    }
  }

  const profiles = await prisma.businessProfile.findMany({ select: { id: true, extensions: true } });
  for (const row of profiles) {
    if (!row.extensions.includes('picsum.photos')) continue;
    const next = row.extensions.replace(/https:\/\/picsum\.photos[^"']+/g, PLACEHOLDERS[0]);
    await prisma.businessProfile.update({ where: { id: row.id }, data: { extensions: next } });
    console.log(`  profile extensions ${row.id}: updated`);
    total += 1;
  }

  console.log(`\nDone. ${total} record(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
