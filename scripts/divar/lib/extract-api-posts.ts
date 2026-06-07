import type { DivarCrawledPost } from './extract-posts';
import type { DivarPostlistResponse } from './api-client';

function readString(obj: unknown, ...keys: string[]): string | undefined {
  let cursor: unknown = obj;
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === 'string' ? cursor.trim() : undefined;
}

function isNoiseTitle(title: string): boolean {
  if (title.length < 8 || title.length > 220) return true;
  return /بروزرسانی|دانلود نسخه|سایت دیوار|نیاز به بروزرسانی/i.test(title);
}

/** Extract listing rows from Divar postlist API JSON responses. */
export function extractPostsFromDivarApiResponses(
  responses: DivarPostlistResponse[]
): DivarCrawledPost[] {
  const byTitle = new Map<string, DivarCrawledPost>();

  for (const response of responses) {
    for (const widget of response.list_widgets ?? []) {
      if (widget.widget_type !== 'POST_ROW') continue;
      const data = widget.data;
      if (!data) continue;

      const title = readString(data, 'title');
      if (!title || isNoiseTitle(title)) continue;

      const action = data.action as Record<string, unknown> | undefined;
      const payload = action?.payload as Record<string, unknown> | undefined;
      const webInfo = payload?.web_info as Record<string, unknown> | undefined;

      const district = webInfo?.district_persian as string | undefined;
      const city = webInfo?.city_persian as string | undefined;
      const priceText =
        (data.middle_description_text as string | undefined) ??
        (data.bottom_description_text as string | undefined);
      const token = payload?.token as string | undefined;

      const row: DivarCrawledPost = {
        title,
        district: district?.trim(),
        city: city?.trim(),
        priceText: priceText?.trim(),
        token,
      };

      byTitle.set(title, row);
    }
  }

  return [...byTitle.values()];
}
