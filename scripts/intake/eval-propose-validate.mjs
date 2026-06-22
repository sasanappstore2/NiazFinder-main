// Eval the propose→validate pipeline end-to-end against the live dev server.
// Requires: dev server on :3000 with NEED_INTAKE_PROPOSE_VALIDATE_ENABLED=true,
// LM Studio (gemma) + ollama (bge-m3) up.
//
// Metrics: category top-1 accuracy (when a leaf is expected), city accuracy,
// neighborhood precision (no hallucinated/echoed slugs), OOV safety (niche items
// must NOT confidently auto-fill a wrong category — null/chips is a pass).
//
// Run: node scripts/intake/eval-propose-validate.mjs

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// expectCat: leaf slug we expect auto-filled | null = OOV/ambiguous (must NOT confidently mis-fill)
// expectCity / expectHood: when given, must match (normalized). null = must be empty.
const CASES = [
  { text: 'آپارتمان اجاره‌ای دو خوابه تو نارمک میخوام', expectCat: 'apartment-rent', expectCity: 'تهران', expectHood: 'نارمک' },
  { text: 'یه خونه ویلایی در سمیرم', expectCat: 'villa-sale', expectCity: 'سمیرم', expectHood: null },
  { text: 'یک گرامافون قدیمی سالم میخوام', expectCat: null, expectCity: null, expectHood: null },
  { text: 'دنبال آپارتمان فروشی ۳ خوابه در اصفهان', expectCat: 'apartment-sale', expectCity: 'اصفهان' },
  { text: 'مغازه برای اجاره در بازار تبریز', expectCity: 'تبریز' },
  { text: 'پراید مدل ۹۰ میفروشم', expectCity: null, expectHood: null },
  { text: 'یک لپ‌تاپ دست دوم برای برنامه‌نویسی میخوام', expectCity: null, expectHood: null },
  { text: 'نیاز به پرستار سالمند در مشهد دارم', expectCity: 'مشهد' },
  { text: 'تعمیرکار یخچال در شیراز میخوام', expectCity: 'شیراز' },
  { text: 'زمین کشاورزی در کرمان', expectCity: 'کرمان' },
  { text: 'استخدام حسابدار در شرکت', expectCity: null, expectHood: null },
  { text: 'یه دوربین عکاسی حرفه‌ای کنکور میخوام', expectCity: null, expectHood: null },
];

const norm = (s) => String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, '').trim();

async function analyze(text) {
  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

let catOk = 0, catTotal = 0, oovOk = 0, oovTotal = 0;
let cityOk = 0, cityTotal = 0, hoodOk = 0, hoodTotal = 0, hoodFalse = 0;

console.log('Evaluating propose→validate against', BASE, '\n');
for (const c of CASES) {
  const j = await analyze(c.text);
  const e = j.entities || {};
  const leaf = e.subcategorySlug || e.categorySlug || null;
  const engine = j.meta?.engine || '?';

  let catMark = '·';
  if (c.expectCat === null) {
    oovTotal++;
    // OOV/ambiguous: pass if NOT confidently auto-filled (leaf null → chips), fail if mis-filled.
    const ok = !leaf;
    if (ok) { oovOk++; catMark = 'OOV✓'; } else catMark = `OOV✗(${leaf})`;
  } else if (c.expectCat) {
    catTotal++;
    const ok = leaf === c.expectCat;
    if (ok) { catOk++; catMark = 'cat✓'; } else catMark = `cat✗(${leaf})`;
  }

  let cityMark = '·';
  if ('expectCity' in c) {
    if (c.expectCity === null) {
      cityTotal++;
      const ok = !e.city; if (ok) { cityOk++; cityMark = 'city✓'; } else cityMark = `city✗(${e.city})`;
    } else {
      cityTotal++;
      const ok = norm(e.city) === norm(c.expectCity); if (ok) { cityOk++; cityMark = 'city✓'; } else cityMark = `city✗(${e.city})`;
    }
  }

  let hoodMark = '·';
  if ('expectHood' in c) {
    if (c.expectHood === null) {
      // must NOT have a neighborhood
      if (e.neighborhood) { hoodFalse++; hoodMark = `hood✗FALSE(${e.neighborhood})`; } else hoodMark = 'hood✓none';
    } else {
      hoodTotal++;
      const ok = norm(e.neighborhood) === norm(c.expectHood); if (ok) { hoodOk++; hoodMark = 'hood✓'; } else hoodMark = `hood✗(${e.neighborhood})`;
    }
  }

  console.log(`[${engine.includes('propose') ? 'PV' : 'FB'}] ${catMark} ${cityMark} ${hoodMark}  «${c.text.slice(0, 40)}»`);
}

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(0) : '—');
console.log('\n──────────');
console.log(`Category top-1 (expected): ${catOk}/${catTotal} (${pct(catOk, catTotal)}%)`);
console.log(`OOV safety (no confident mis-fill): ${oovOk}/${oovTotal} (${pct(oovOk, oovTotal)}%)`);
console.log(`City accuracy: ${cityOk}/${cityTotal} (${pct(cityOk, cityTotal)}%)`);
console.log(`Neighborhood (expected): ${hoodOk}/${hoodTotal} (${pct(hoodOk, hoodTotal)}%)  | false neighborhoods: ${hoodFalse}`);
