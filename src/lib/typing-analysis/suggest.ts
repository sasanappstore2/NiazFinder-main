import { normalizeTypingText } from './normalize-text';

const PHRASES: string[] = [
  'دنبال برنامه‌نویس react هستم',
  'تعمیرکار کولر فوری تهران',
  'خرید آپارتمان دو خوابه تهران',
  'اجاره آپارتمان سعادت‌آباد',
  'فروش گوشی آیفون',
  'استخدام حسابدار تمام‌وقت',
  'اسباب‌کشی از کرج به تهران',
  'طراحی سایت فروشگاهی',
  'نظافت منزل هفتگی',
  'خرید پژو ۲۰۶ کارکرده',
];

export function buildSuggestions(text: string, limit = 5): string[] {
  const norm = normalizeTypingText(text);
  if (norm.length < 2) return PHRASES.slice(0, limit);

  const scored = PHRASES.map((p) => {
    const pn = normalizeTypingText(p);
    let score = 0;
    if (pn.startsWith(norm) || norm.startsWith(pn.slice(0, norm.length))) score += 3;
    for (const token of norm.split(' ')) {
      if (token.length > 2 && pn.includes(token)) score += 1;
    }
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return PHRASES.filter((p) => normalizeTypingText(p).includes(norm.split(' ')[0] ?? '')).slice(
      0,
      limit
    );
  }

  return scored.slice(0, limit).map((x) => x.p);
}
