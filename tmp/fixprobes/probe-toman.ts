import { extractPostNaturalFields } from '@/lib/need-intake/laya/post-natural-extractor';
const r = extractPostNaturalFields('رهن ۵۰ تومان').entities as Record<string, unknown>;
console.log('toman-50-rahn:', r.rahnAmount);
const r2 = extractPostNaturalFields('بودجه ۸۰۰ تومان').entities as Record<string, unknown>;
console.log('toman-800-budget:', r2.budgetMax);
