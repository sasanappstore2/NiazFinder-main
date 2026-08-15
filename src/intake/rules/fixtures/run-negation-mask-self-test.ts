/**
 * Negation mask for contrastive estate phrasing.
 * Run: npx --yes tsx src/intake/rules/fixtures/run-negation-mask-self-test.ts
 */
import assert from 'node:assert/strict';
import { maskNegatedCategoryCues } from '@/intake/rules/negation-mask';

function main() {
  const a = maskNegatedCategoryCues('می‌خوام اپارتمان بخرم، نه ویلا و نه زمین');
  assert.match(a, /اپارتمان|آپارتمان/);
  assert.doesNotMatch(a, /ویلا/);
  assert.doesNotMatch(a, /زمین/);

  const b = maskNegatedCategoryCues('ویلا می‌خوام بخرم. نه مغازه نه زمین کلنگی');
  assert.match(b, /ویلا/);
  assert.doesNotMatch(b, /مغازه/);

  const c = maskNegatedCategoryCues('خرید زمین و کلنگی. آپارتمان و سوله نمی‌خوام؛ فقط زمین');
  assert.match(c, /زمین/);
  assert.doesNotMatch(c, /سوله/);
  assert.doesNotMatch(c, /آپارتمان/);

  const d = maskNegatedCategoryCues('مغازه خیابانی نمی‌خوام، دفتر کار می‌خوام');
  assert.match(d, /دفتر/);
  assert.doesNotMatch(d, /مغازه/);

  const e = maskNegatedCategoryCues(
    'رهن و اجاره آپارتمان. اجاره روزانه و سوئیت مسافری نمی‌خوام'
  );
  assert.match(e, /آپارتمان/);
  assert.doesNotMatch(e, /سوئیت/);
  assert.doesNotMatch(e, /روزانه/);

  const f = maskNegatedCategoryCues('کلنگی اجاره می‌کنم. مشارکت در ساخت نیست؛ اجاره ماهانه');
  assert.match(f, /کلنگی|اجاره/);
  assert.doesNotMatch(f, /مشارکت/);

  assert.match(maskNegatedCategoryCues('اجاره روزانه ویلا در رامسر'), /ویلا/);
  assert.match(maskNegatedCategoryCues('اجاره روزانه ویلا در رامسر'), /روزانه/);

  console.log('negation-mask: ok');
}

main();
