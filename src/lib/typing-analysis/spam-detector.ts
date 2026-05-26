import { normalizeTypingText } from './normalize-text';

const BLOCKLIST = ['casino', 'bet', 'viagra', 'xxx'];

export function detectSpam(text: string): { isSpam: boolean; reason?: string } {
  const norm = normalizeTypingText(text);
  if (norm.length < 2) return { isSpam: false };
  if (norm.length > 2000) return { isSpam: true, reason: 'متن بیش از حد طولانی' };

  for (const w of BLOCKLIST) {
    if (norm.includes(w)) return { isSpam: true, reason: 'محتوای غیرمجاز' };
  }

  if (/(.)\1{8,}/.test(norm)) {
    return { isSpam: true, reason: 'تکرار بیش از حد کاراکتر' };
  }

  const letters = norm.replace(/[^a-z\u0600-\u06ff]/gi, '');
  if (letters.length > 20) {
    const unique = new Set(letters).size / letters.length;
    if (unique < 0.15) return { isSpam: true, reason: 'متن بی‌معنی' };
  }

  const linkCount = (norm.match(/https?:\/\//g) ?? []).length;
  if (linkCount > 3) return { isSpam: true, reason: 'لینک زیاد' };

  return { isSpam: false };
}
