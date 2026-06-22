// Eval the location-grounding RAG: embed fuzzy/typo/finglish/paraphrase queries
// with bge-m3, cosine-rank against the precomputed index, and check whether the
// expected province (and city, when given) is retrieved. Standalone (no
// server-only imports) so it mirrors the runtime module's math directly.
//
// Run: node scripts/rag/eval-location-grounding.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'data/rag/location-grounding.embeddings.jsonl');
const EMBED_URL = (process.env.LOCAL_EMBED_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.LOCAL_EMBED_MODEL || 'bge-m3';

const norm = (s) =>
  String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();

// ── load + L2-normalize index ──
const lines = readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
const meta = [];
let dims = 0;
let matrix = null;
lines.forEach((l, r) => {
  const rec = JSON.parse(l);
  if (!dims) {
    dims = rec.vec.length;
    matrix = new Float32Array(lines.length * dims);
  }
  const base = r * dims;
  let sum = 0;
  for (let i = 0; i < dims; i++) sum += rec.vec[i] * rec.vec[i];
  const inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  for (let i = 0; i < dims; i++) matrix[base + i] = rec.vec[i] * inv;
  const { vec, ...m } = rec;
  meta.push(m);
});

async function embed(text) {
  const res = await fetch(`${EMBED_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: [text] }),
  });
  const j = await res.json();
  return j.data[0].embedding;
}

function topK(qvecRaw, k = 5) {
  let qn = 0;
  for (let i = 0; i < dims; i++) qn += qvecRaw[i] * qvecRaw[i];
  const inv = qn > 0 ? 1 / Math.sqrt(qn) : 0;
  const qv = new Float32Array(dims);
  for (let i = 0; i < dims; i++) qv[i] = qvecRaw[i] * inv;
  const scored = [];
  for (let r = 0; r < meta.length; r++) {
    const base = r * dims;
    let dot = 0;
    for (let i = 0; i < dims; i++) dot += qv[i] * matrix[base + i];
    scored.push({ m: meta[r], score: dot });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

const provinceOf = (m) => (m.type === 'province' ? m.name : m.province);

// query → { province, city? }  (city/finglish/typo/neighborhood/paraphrase mix)
const CASES = [
  ['نارمک', { province: 'تهران' }],
  ['من نارمک هستم دنبال خونه', { province: 'تهران' }],
  ['tehran', { province: 'تهران', city: 'تهران' }],
  ['تهرون', { province: 'تهران' }],
  ['esfahan', { province: 'اصفهان', city: 'اصفهان' }],
  ['اصفهان خونه میخوام', { province: 'اصفهان', city: 'اصفهان' }],
  ['mashhad', { province: 'خراسان رضوی', city: 'مشهد' }],
  ['در مشهد رضوی', { province: 'خراسان رضوی', city: 'مشهد' }],
  ['tabriz', { province: 'آذربایجان شرقی', city: 'تبریز' }],
  ['خونه تو شیراز', { province: 'فارس', city: 'شیراز' }],
  ['shiraz fars', { province: 'فارس', city: 'شیراز' }],
  ['کرمانشاه', { province: 'کرمانشاه', city: 'کرمانشاه' }],
  ['اهواز', { province: 'خوزستان', city: 'اهواز' }],
  ['بندر عباس', { province: 'هرمزگان', city: 'بندرعباس' }],
  ['کرج', { province: 'البرز', city: 'کرج' }],
  ['قم', { province: 'قم', city: 'قم' }],
  ['رشت گیلان', { province: 'گیلان', city: 'رشت' }],
  ['یزد', { province: 'یزد', city: 'یزد' }],
  ['ساری مازندران', { province: 'مازندران', city: 'ساری' }],
  ['ارومیه', { province: 'آذربایجان غربی', city: 'ارومیه' }],
];

let p1 = 0, p5 = 0, c5 = 0, cityCases = 0;
console.log(`Index: ${meta.length} records, ${dims}d\n`);
for (const [q, exp] of CASES) {
  const hits = topK(await embed(q), 5);
  const provs = hits.map((h) => provinceOf(h.m));
  const cities = hits.map((h) => (h.m.type === 'city' ? h.m.name : h.m.city));
  const top1Prov = norm(provs[0]) === norm(exp.province);
  const inTop5Prov = provs.some((p) => norm(p) === norm(exp.province));
  if (top1Prov) p1++;
  if (inTop5Prov) p5++;
  let cityOk = '—';
  if (exp.city) {
    cityCases++;
    const ok = cities.some((c) => norm(c) === norm(exp.city));
    if (ok) c5++;
    cityOk = ok ? '✓' : '✗';
  }
  console.log(
    `${(top1Prov ? '✓' : inTop5Prov ? '~' : '✗')} city:${cityOk}  "${q}"  →  top1=${hits[0].m.type}:${hits[0].m.name} (${provs[0]}) [${hits[0].score.toFixed(3)}]`,
  );
}
console.log(
  `\nProvince  top1: ${p1}/${CASES.length} (${((p1 / CASES.length) * 100).toFixed(0)}%)   top5: ${p5}/${CASES.length} (${((p5 / CASES.length) * 100).toFixed(0)}%)`,
);
console.log(`City in top5: ${c5}/${cityCases} (${((c5 / cityCases) * 100).toFixed(0)}%)`);
