export interface IntentGistPromptHints {
  cityName?: string | null;
  citySlug?: string | null;
}

/** One plain Persian sentence for rules + UI — token-cheap output. */
export const INTENT_GIST_SYSTEM_PROMPT =
  'You interpret Persian marketplace ads for NiazFinder. Reply with ONE simple Persian sentence only. No JSON, no markdown, no bullet list.';

export function buildIntentGistUserPrompt(text: string, hints?: IntentGistPromptHints): string {
  const cityHint =
    hints?.cityName?.trim() ||
    hints?.citySlug?.trim() ||
    '';

  const hintBlock = cityHint
    ? `\nشهر ترجیحی کاربر (اگر در متن نیامده، در جمله نیاور مگر مطمئن باشی): ${cityHint}`
    : '';

  return `متن نیاز:
"""
${text.trim()}
"""${hintBlock}

در یک جملهٔ سادهٔ فارسی خلاصه کن که کاربر چه می‌خواهد (موضوع + شهر/محله/بودجه اگر هست):
- نوع نیاز یا کالا/خدمت (خرید/اجاره/رهن و …)
- شهر یا محله اگر در متن آمده
- بودجه یا متراژ اگر در متن آمده
- جزئیات مهم دیگر اگر صریح آمده

فقط جمله را بنویس، بدون توضیح.`;
}
