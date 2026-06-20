import { detectRepairServiceCategory } from '@/lib/need-intake/service-repair-intent';
import { parseIntentFromText, suggestNeedCategoriesFromText } from '@/lib/need-intake/intent-parser';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';

const TEXT =
  'من یک تعمیرکار خودرو میخوام برای پژو ۲۰۷ خودم موتورش مشکل داره در فرهنگ مشهد هستم همین محدوده باشه بهتره که ماشینشو روشن نکنم';

const repair = detectRepairServiceCategory(TEXT);
const parsed = parseIntentFromText(TEXT);
const suggest = suggestNeedCategoriesFromText(TEXT, 5);
const resolved = resolveIntakeCategory({ sourceText: TEXT });

let failed = 0;

if (repair !== 'vehicle-repair') {
  console.error('FAIL detectRepairServiceCategory:', repair);
  failed++;
}
if (parsed.categorySlug !== 'repairs' && parsed.categorySlug !== 'vehicle-repair') {
  console.error('FAIL parse category:', parsed.categorySlug);
  failed++;
}
if (resolved.categorySlug !== 'repairs') {
  console.error('FAIL resolve category:', resolved);
  failed++;
}
if (!suggest.some((s) => s.slug === 'vehicle-repair')) {
  console.error('FAIL suggest missing vehicle-repair:', suggest);
  failed++;
}
if (suggest[0]?.slug === 'car' || suggest[0]?.slug === 'car-ride') {
  console.error('FAIL suggest top is car:', suggest);
  failed++;
}

if (failed > 0) process.exit(1);
console.log('vehicle-repair intent self-test: OK');
console.log({ repair, parsed: parsed.categorySlug, resolved, suggest });
