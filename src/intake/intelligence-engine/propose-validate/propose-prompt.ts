/**
 * Prompt for the LLM proposal stage. The category LEAF list is injected so the
 * model can only RANK real slugs (no hallucination). Neighborhoods are NOT
 * listed — the model proposes names exactly as written in the need, and the
 * catalog validates them afterward.
 */
import { CANONICAL_CATEGORIES } from '@/config/categories';

let leafLinesCache: string | null = null;

/** Leaf categories as `slug \t parentTitle › title` — parent disambiguates repeated leaf titles. */
export function buildLeafCatalogLines(): string {
  if (leafLinesCache) return leafLinesCache;
  const parents = new Set(
    CANONICAL_CATEGORIES.map((c) => c.parentSlug).filter((p): p is string => Boolean(p)),
  );
  const bySlug = new Map(CANONICAL_CATEGORIES.map((c) => [c.slug, c]));
  const lines: string[] = [];
  for (const c of CANONICAL_CATEGORIES) {
    if (parents.has(c.slug)) continue; // not a leaf
    const parent = c.parentSlug ? bySlug.get(c.parentSlug) : null;
    const label = parent ? `${parent.title} › ${c.title}` : c.title;
    lines.push(`${c.slug}\t${label}`);
  }
  leafLinesCache = lines.join('\n');
  return leafLinesCache;
}

export const PROPOSE_SYSTEM_PROMPT =
  'تو دستیار دسته‌بندی و مکان برای نیازفایندر هستی. فقط JSON معتبر برگردان، بدون markdown و بدون توضیح.';

export function buildProposePrompt(text: string, leafLines: string): string {
  return `متنِ نیازِ کاربر:
"""
${text}
"""

فهرست دسته‌بندی‌های مجاز (هر خط: slug<TAB>عنوان). فقط از همین slugها انتخاب کن:
${leafLines}

وظیفه:
1) categories: تا ۵ slug از فهرست بالا که بیشترین تناسب را با نیاز دارند، به‌ترتیب از محتمل‌ترین. هرگز slug جدید نساز.
2) city: نام شهر همان‌طور که در متن آمده (اگر نبود null).
3) province: نام استان (اگر معلوم بود، وگرنه null).
4) neighborhoods: تا ۵ نام محله **دقیقاً همان‌طور که در متن نوشته شده** — ترجمه/تغییر نده، حدس نزن؛ اگر محله‌ای نبود [] بده.

فقط این JSON را برگردان:
{"categories":["slug1","slug2"],"city":null,"province":null,"neighborhoods":[],"confidence":0.0}`;
}
