/** Detect Persian UI strings corrupted to "?" placeholders (UTF-8 write bugs). */
export function hasCorruptedPersianPlaceholder(text: string): boolean {
  if (!text) return false;
  if (/\?{3,}/.test(text)) return true;
  if (/[\u0600-\u06FF]+ \? [\u0600-\u06FF]+/.test(text)) return true;
  return false;
}

const PLATFORM_BOT_WELCOME =
  'سلام! من دستیار نیازفایندر هستم. چطور می‌تونم کمکتون کنم؟';

const KNOWN_DISPLAY_REPAIRS: ReadonlyArray<{ test: (s: string) => boolean; value: string }> = [
  {
    test: (s) => /^\?{4}!/.test(s) || /\?{8}/.test(s),
    value: PLATFORM_BOT_WELCOME,
  },
  {
    test: (s) => /^\?+ VIP/.test(s),
    value: 'نیاز VIP جدید',
  },
];

/** Strip or repair corrupted Persian before showing user-facing text. */
export function sanitizeUserFacingPersianText(text: string): string {
  if (!text || !hasCorruptedPersianPlaceholder(text)) return text;
  for (const rule of KNOWN_DISPLAY_REPAIRS) {
    if (rule.test(text)) return rule.value;
  }
  return text
    .replace(/\?{3,}/g, '')
    .replace(/[\u0600-\u06FF]+ \? [\u0600-\u06FF]+/g, (m) => m.replace(/ \? /g, ' — '))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Sanitize chat/API text payloads; leave structured card JSON untouched. */
export function sanitizeMessageContentForClient(content: string, type?: string): string {
  if (type && type !== 'TEXT') return content;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return content;
  return sanitizeUserFacingPersianText(content);
}

