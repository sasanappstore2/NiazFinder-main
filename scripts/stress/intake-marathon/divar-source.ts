import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import {
  extractJsonFromChatContent,
  localChatCompletions,
} from '@/lib/need-intake/local-chat-client';

const DIVAR_CITY_SLUGS = ['tehran', 'mashhad', 'isfahan', 'shiraz', 'karaj', 'tabriz', 'ahvaz'];

const DIVAR_CATEGORY_BY_VERTICAL: Record<string, string[]> = {
  'real-estate': ['residential-rent', 'residential-sell', 'commercial-rent'],
  vehicles: ['light', 'motorcycles'],
  electronics: ['mobile-phones', 'computers'],
  services: ['building-trades', 'cleaning'],
  'home-appliances': ['home-kitchen'],
  'personal-items': ['clothing-and-shoes'],
  entertainment: ['book-student-literature'],
  jobs: ['administration-and-hr'],
};

interface DivarCache {
  titles: string[];
  usedIndices: number[];
}

let cache: DivarCache = { titles: [], usedIndices: [] };
let cachePath = '';

export async function loadDivarCache(runDir: string): Promise<void> {
  cachePath = path.join(runDir, 'divar-cache.json');
  try {
    cache = JSON.parse(await readFile(cachePath, 'utf8')) as DivarCache;
  } catch {
    cache = { titles: [], usedIndices: [] };
  }
}

export async function saveDivarCache(runDir: string): Promise<void> {
  cachePath = path.join(runDir, 'divar-cache.json');
  await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

function decodeTitle(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
}

function extractTitlesFromHtml(html: string): string[] {
  const re = /"title":"((?:[^"\\]|\\.)*)"/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = decodeTitle(m[1]).trim();
    if (title.length < 10 || title.length > 220) continue;
    if (title.includes('\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC') || title.includes('\u062F\u0627\u0646\u0644\u0648\u062F')) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    out.push(title);
  }
  return out;
}

async function fetchDivarTitles(city: string, category: string): Promise<string[]> {
  const url = `https://divar.ir/s/${city}/${category}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'fa-IR,fa;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Divar HTTP ${res.status}`);
  return extractTitlesFromHtml(await res.text());
}

async function divarTitleToNeed(title: string, profile: CategoryTestProfile): Promise<string | null> {
  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'Convert Divar ad titles into natural Persian NEED posts (user seeking/buying/renting). JSON only.',
      },
      {
        role: 'user',
        content: `Divar title: "${title}"
Target category: ${profile.categorySlug} (${profile.titleFa})
City hints: ${(profile.locationHints ?? ['\u062A\u0647\u0631\u0627\u0646']).join(', ')}
Write 1-2 colloquial Persian sentences as if posting a need on NiazFinder.
Return JSON: {"text":"..."}`,
      },
    ],
    { maxTokens: 220, temperature: 0.75, maxRetries: 1 }
  );
  if (!chat) return null;
  const json = extractJsonFromChatContent(chat.content) as { text?: string } | null;
  const text = json?.text?.trim();
  return text && text.length >= 12 ? text : null;
}

export async function fetchDivarNeedText(
  profile: CategoryTestProfile,
  index: number
): Promise<string | null> {
  if (cache.titles.length - cache.usedIndices.length < 5) {
    const city = DIVAR_CITY_SLUGS[index % DIVAR_CITY_SLUGS.length]!;
    const cats = DIVAR_CATEGORY_BY_VERTICAL[profile.vertical] ?? ['light'];
    const cat = cats[index % cats.length]!;
    try {
      const fresh = await fetchDivarTitles(city, cat);
      cache.titles.push(...fresh);
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      return null;
    }
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const idx = (index * 7 + attempt * 13) % cache.titles.length;
    if (cache.usedIndices.includes(idx)) continue;
    const title = cache.titles[idx];
    if (!title) continue;

    const need = await divarTitleToNeed(title, profile);
    if (need) {
      cache.usedIndices.push(idx);
      return need;
    }
  }

  return null;
}
