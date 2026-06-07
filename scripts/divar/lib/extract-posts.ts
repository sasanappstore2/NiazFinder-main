import { decodeDivarJsonString } from './crawl-client';

export interface DivarCrawledPost {
  token?: string;
  title: string;
  district?: string;
  city?: string;
  priceText?: string;
  topDescription?: string;
}

const WEB_INFO_WITH_DISTRICT_RE =
  /"web_info":\{"title":"((?:[^"\\]|\\.)*)"(?:,"open_new_tab":(?:true|false))?,"district_persian":"((?:[^"\\]|\\.)*)","city_persian":"((?:[^"\\]|\\.)*)"\}/g;

/** Some cities (e.g. tabriz) omit district_persian in SSR payloads. */
const WEB_INFO_CITY_ONLY_RE =
  /"web_info":\{"title":"((?:[^"\\]|\\.)*)","city_persian":"((?:[^"\\]|\\.)*)"(?:,"category_slug_persian":"((?:[^"\\]|\\.)*)")?\}/g;

const TOKEN_BEFORE_TITLE_RE =
  /"token":"([^"]+)","should_indicate_seen_status":true[\s\S]{0,400}?"title":"((?:[^"\\]|\\.)*)"/g;

const PRICE_NEAR_TITLE_RE =
  /"title":"((?:[^"\\]|\\.)*)"[\s\S]{0,1200}?"middle_description_text":"((?:[^"\\]|\\.)*)"/g;

function cleanTitle(raw: string): string {
  let text = decodeDivarJsonString(raw);
  text = text.replace(/\\u002F/gi, '/').replace(/\u002F/g, '/');
  return text.replace(/\s+/g, ' ').trim();
}

function isNoiseTitle(title: string): boolean {
  if (title.length < 8 || title.length > 220) return true;
  return /بروزرسانی|دانلود نسخه|سایت دیوار|نیاز به بروزرسانی/i.test(title);
}

/** Extract structured listing rows from Divar SSR HTML. */
export function extractPostsFromDivarHtml(html: string): DivarCrawledPost[] {
  const byTitle = new Map<string, DivarCrawledPost>();

  for (const match of html.matchAll(WEB_INFO_WITH_DISTRICT_RE)) {
    const title = cleanTitle(match[1]!);
    if (isNoiseTitle(title)) continue;
    const district = cleanTitle(match[2]!);
    const city = cleanTitle(match[3]!);
    byTitle.set(title, { title, district, city });
  }

  for (const match of html.matchAll(WEB_INFO_CITY_ONLY_RE)) {
    const title = cleanTitle(match[1]!);
    if (isNoiseTitle(title)) continue;
    const city = cleanTitle(match[2]!);
    const existing = byTitle.get(title);
    byTitle.set(title, { ...existing, title, city: existing?.city ?? city });
  }

  for (const match of html.matchAll(TOKEN_BEFORE_TITLE_RE)) {
    const token = match[1]!;
    const title = cleanTitle(match[2]!);
    if (isNoiseTitle(title)) continue;
    const row = byTitle.get(title) ?? { title };
    row.token = token;
    byTitle.set(title, row);
  }

  for (const match of html.matchAll(PRICE_NEAR_TITLE_RE)) {
    const title = cleanTitle(match[1]!);
    if (!byTitle.has(title)) continue;
    const priceText = cleanTitle(match[2]!);
    const row = byTitle.get(title)!;
    row.priceText = priceText;
    byTitle.set(title, row);
  }

  return [...byTitle.values()];
}
