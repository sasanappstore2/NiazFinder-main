/**
 * Sample Divar listing titles across all verticals (dev research only).
 *
 * Run:
 *   npm run divar:research-all
 *   npm run divar:research-all -- --city=tehran --limit=200 --delayMs=400
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { DIVAR_ALL_VERTICALS, RESEARCH_KEYWORD_BUCKETS, type DivarResearchCategory } from './categories';

const OUT_DIR = path.join(process.cwd(), 'data/divar/research');

function parseArgs(): { city: string; limit: number; delayMs: number } {
  let city = 'tehran';
  let limit = 300;
  let delayMs = 400;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--city=')) city = arg.slice(7);
    if (arg.startsWith('--limit=')) limit = Math.max(1, Number(arg.slice(8)) || 300);
    if (arg.startsWith('--delayMs=')) delayMs = Math.max(150, Number(arg.slice(10)) || 400);
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

async function fetchCategoryTitles(city: string, cat: DivarResearchCategory): Promise<string[]> {
  const url = `https://divar.ir/s/${city}/${cat.divarSlug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'fa-IR,fa;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return extractTitlesFromHtml(await res.text());
}

async function main(): Promise<void> {
  const { city, limit, delayMs } = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  const summary: Record<string, { titleFa: string; sampleCount: number }> = {};
  console.log(`Divar all-verticals research: city=${city} categories=${DIVAR_ALL_VERTICALS.length}`);

  for (const cat of DIVAR_ALL_VERTICALS) {
    try {
      const titles = (await fetchCategoryTitles(city, cat)).slice(0, limit);
      await writeFile(
        path.join(OUT_DIR, `${cat.nfSlug}.json`),
        JSON.stringify(
          {
            nfSlug: cat.nfSlug,
            divarSlug: cat.divarSlug,
            city,
            fetchedAt: new Date().toISOString(),
            sampleCount: titles.length,
            titles,
            keywords: countKeywords(titles),
          },
          null,
          2
        ),
        'utf8'
      );
      summary[cat.nfSlug] = { titleFa: cat.titleFa, sampleCount: titles.length };
      console.log(`  OK ${cat.nfSlug}: ${titles.length}`);
    } catch (e) {
      console.error(`  FAIL ${cat.nfSlug}:`, e instanceof Error ? e.message : e);
      summary[cat.nfSlug] = { titleFa: cat.titleFa, sampleCount: 0 };
    }
    await sleep(delayMs);
  }

  await writeFile(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify({ city, generatedAt: new Date().toISOString(), categories: summary }, null, 2),
    'utf8'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
