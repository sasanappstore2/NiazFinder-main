/**
 * Sample Divar real-estate listing titles per category (dev research only).
 *
 * Run:
 *   npm run divar:research
 *   npm run divar:research -- --city=tehran --limit=200 --delayMs=400
 *
 * Output: data/divar/research/{nfSlug}.json + summary.json
 *
 * Note: Public HTML embeds many titles per page (~200–500 unique). Full 1000/category
 * needs authenticated postlist API; this script caps at available HTML titles.
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import {
  DIVAR_REAL_ESTATE_CATEGORIES,
  RESEARCH_KEYWORD_BUCKETS,
  type DivarResearchCategory,
} from './categories';

const OUT_DIR = path.join(process.cwd(), 'data/divar/research');

function parseArgs(): { city: string; limit: number; delayMs: number } {
  let city = 'tehran';
  let limit = 500;
  let delayMs = 350;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--city=')) city = arg.slice(7);
    if (arg.startsWith('--limit=')) limit = Math.max(1, Number(arg.slice(8)) || 500);
    if (arg.startsWith('--delayMs=')) delayMs = Math.max(100, Number(arg.slice(10)) || 350);
  }
  return { city, limit, delayMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeTitle(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
  }
}

function extractTitlesFromHtml(html: string): string[] {
  const re = /"title":"((?:[^"\\]|\\.)*)"/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = decodeTitle(m[1]).trim();
    if (title.length < 8 || title.length > 220) continue;
    if (title.includes('بروزرسانی') || title.includes('دانلود نسخه')) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    out.push(title);
  }
  return out;
}

function countKeywords(titles: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [bucket, words] of Object.entries(RESEARCH_KEYWORD_BUCKETS)) {
    counts[bucket] = 0;
    for (const title of titles) {
      const t = title.toLowerCase();
      if (words.some((w) => t.includes(w))) counts[bucket]++;
    }
  }
  return counts;
}

async function fetchCategoryTitles(
  city: string,
  cat: DivarResearchCategory
): Promise<string[]> {
  const url = `https://divar.ir/s/${city}/${cat.divarSlug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'fa-IR,fa;q=0.9',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const html = await res.text();
  return extractTitlesFromHtml(html);
}

async function main(): Promise<void> {
  const { city, limit, delayMs } = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  const summary: Record<
    string,
    { titleFa: string; divarSlug: string; sampleCount: number; keywords: Record<string, number> }
  > = {};

  console.log(`Divar research: city=${city} limit=${limit} delay=${delayMs}ms`);

  for (const cat of DIVAR_REAL_ESTATE_CATEGORIES) {
    try {
      const titles = (await fetchCategoryTitles(city, cat)).slice(0, limit);
      const payload = {
        nfSlug: cat.nfSlug,
        divarSlug: cat.divarSlug,
        city,
        fetchedAt: new Date().toISOString(),
        sampleCount: titles.length,
        titles,
        keywords: countKeywords(titles),
      };
      await writeFile(
        path.join(OUT_DIR, `${cat.nfSlug}.json`),
        JSON.stringify(payload, null, 2),
        'utf8'
      );
      summary[cat.nfSlug] = {
        titleFa: cat.titleFa,
        divarSlug: cat.divarSlug,
        sampleCount: titles.length,
        keywords: payload.keywords,
      };
      console.log(`  OK ${cat.nfSlug}: ${titles.length} titles`);
    } catch (e) {
      console.error(`  FAIL ${cat.nfSlug}:`, e instanceof Error ? e.message : e);
      summary[cat.nfSlug] = {
        titleFa: cat.titleFa,
        divarSlug: cat.divarSlug,
        sampleCount: 0,
        keywords: {},
      };
    }
    await sleep(delayMs);
  }

  await writeFile(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify({ city, generatedAt: new Date().toISOString(), categories: summary }, null, 2),
    'utf8'
  );
  console.log(`Wrote ${OUT_DIR}/summary.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
