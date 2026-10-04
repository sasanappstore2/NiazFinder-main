/** TEMP repro — will be removed. Probe the normalization pipeline for خابه. */
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { repairAttributeKeywords } from '@/intake/extractors/attributeExtractors';
import { applyAdvancedRules } from '@/intake/smart-extractor/rules/advanced-rules-engine';

const corrupt = 'خونه 3 خابه میخوام اجاره نیاوران';
const aliased = applyTypoAliases(corrupt);
console.log('aliased :', JSON.stringify(aliased));
const normalized = normalizePersian(aliased);
console.log('normalized:', JSON.stringify(normalized));
console.log('repaired  :', JSON.stringify(repairAttributeKeywords(normalized)));
console.log('advanced  :', JSON.stringify(applyAdvancedRules(normalized)));

// Also check raw (no aliases) in case order differs
const normalizedRaw = normalizePersian(corrupt);
console.log('normRaw   :', JSON.stringify(normalizedRaw));
console.log('repairedRaw:', JSON.stringify(repairAttributeKeywords(normalizedRaw)));
