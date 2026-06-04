/**
 * Batch-optimize existing uploads under public/uploads.
 *
 * Usage:
 *   npx tsx scripts/optimize-existing-uploads.ts           # dry-run
 *   npx tsx scripts/optimize-existing-uploads.ts --apply   # write .webp + update DB URLs
 */
import { readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { optimizeUploadBuffer } from '../src/lib/image/optimize-upload';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

type FileEntry = { abs: string; rel: string; ext: string };

async function walk(dir: string, base = UPLOADS_ROOT): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  let items: string[];
  try {
    items = await readdir(dir);
  } catch {
    return entries;
  }
  for (const name of items) {
    const abs = path.join(dir, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      entries.push(...(await walk(abs, base)));
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const rel = path.relative(base, abs).replace(/\\/g, '/');
    entries.push({ abs, rel, ext });
  }
  return entries;
}

function publicUrlFromRel(rel: string): string {
  return `/uploads/${rel}`;
}

function webpRel(rel: string): string {
  const parsed = path.parse(rel);
  return `${parsed.dir}/${parsed.name}.webp`.replace(/^\//, '');
}

async function replaceUrlsInDb(db: PrismaClient, oldUrl: string, newUrl: string) {
  if (oldUrl === newUrl) return;

  await db.$executeRaw`
    UPDATE "BusinessProfile"
    SET "logo" = REPLACE("logo", ${oldUrl}, ${newUrl})
    WHERE "logo" LIKE ${'%' + oldUrl + '%'}
  `;

  await db.$executeRaw`
    UPDATE "BusinessProfile"
    SET "coverImage" = REPLACE("coverImage", ${oldUrl}, ${newUrl})
    WHERE "coverImage" LIKE ${'%' + oldUrl + '%'}
  `;

  const offers = await db.businessOffer.findMany({ select: { id: true, images: true } });
  for (const o of offers) {
    if (!o.images.includes(oldUrl)) continue;
    await db.businessOffer.update({
      where: { id: o.id },
      data: { images: o.images.split(oldUrl).join(newUrl) },
    });
  }

  const messages = await db.message.findMany({
    where: { attachmentUrls: { contains: oldUrl } },
    select: { id: true, attachmentUrls: true },
  });
  for (const m of messages) {
    if (!m.attachmentUrls?.includes(oldUrl)) continue;
    await db.message.update({
      where: { id: m.id },
      data: { attachmentUrls: m.attachmentUrls.split(oldUrl).join(newUrl) },
    });
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const files = await walk(UPLOADS_ROOT);

  let processed = 0;
  let skipped = 0;
  let savedBytes = 0;
  const db = apply ? new PrismaClient() : null;

  console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${files.length} image files under public/uploads`);

  for (const file of files) {
    const input = await readFile(file.abs);
    const preset = file.rel.includes('/chat/') ? 'chat' : 'product';
    const mime =
      file.ext === '.png'
        ? 'image/png'
        : file.ext === '.gif'
          ? 'image/gif'
          : file.ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg';

    const result = await optimizeUploadBuffer(input, preset, mime);

    if (!result.optimized || result.bytesAfter >= result.bytesBefore) {
      skipped += 1;
      continue;
    }

    const oldUrl = publicUrlFromRel(file.rel);
    const newRel = webpRel(file.rel);
    const newAbs = path.join(UPLOADS_ROOT, newRel);
    const newUrl = publicUrlFromRel(newRel);

    processed += 1;
    savedBytes += result.bytesBefore - result.bytesAfter;

    console.log(
      `  ${oldUrl} -> ${newUrl} (${(result.bytesBefore / 1024).toFixed(0)}KB -> ${(result.bytesAfter / 1024).toFixed(0)}KB)`
    );

    if (apply && db) {
      await writeFile(newAbs, result.buffer);
      if (newUrl !== oldUrl) {
        await replaceUrlsInDb(db, oldUrl, newUrl);
        if (file.abs !== newAbs) {
          await unlink(file.abs).catch(() => {});
        }
      } else {
        await writeFile(file.abs, result.buffer);
      }
    }
  }

  console.log(
    `\nDone: ${processed} optimizable, ${skipped} skipped, saved ~${(savedBytes / 1024 / 1024).toFixed(2)} MB`
  );
  if (!apply) {
    console.log('Run with --apply to write files and update database URLs.');
  }

  await db?.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
