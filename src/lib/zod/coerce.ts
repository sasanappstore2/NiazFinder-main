import { z } from 'zod';

/** Coerce unknown JSON values to trimmed strings (cookie/API drift). */
export function coerceToTrimmedString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

/** Optional string fields that may arrive as numbers from cookies or legacy clients. */
export const zOptionalCoercedString = z.preprocess((val) => {
  if (val == null || val === '') return undefined;
  const trimmed = coerceToTrimmedString(val);
  return trimmed || undefined;
}, z.string().optional());

export const zRequiredCoercedString = z.preprocess(
  (val) => coerceToTrimmedString(val),
  z.string()
);

/** Map Zod issues to user-facing Persian (avoid raw English in toasts). */
export function formatZodErrorFa(error: z.ZodError, fallback = 'اطلاعات واردشده معتبر نیست'): string {
  const issue = error.issues[0];
  if (!issue) return fallback;

  if (issue.code === 'too_small' && 'minimum' in issue) {
    return typeof issue.message === 'string' && /[\u0600-\u06FF]/.test(issue.message)
      ? issue.message
      : 'مقدار واردشده کوتاه است';
  }

  if (issue.code === 'invalid_type') {
    if (issue.expected === 'string') {
      return 'این فیلد باید متن باشد؛ لطفاً دوباره با حروف فارسی تلاش کنید';
    }
    return fallback;
  }

  if (typeof issue.message === 'string' && /[\u0600-\u06FF]/.test(issue.message)) {
    return issue.message;
  }

  return fallback;
}
