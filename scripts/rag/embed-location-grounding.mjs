// Embed the location/category grounding corpus with bge-m3 (ollama) for the
// hybrid RAG location resolver.
//
// Selects from data/rag/niazfinder-grounding.rag.jsonl:
//   - ALL provinces (31)  ALL cities (1207)  ALL categories (129)   ← serve city/province detection
//   - neighborhoods of the major capital cities (by Persian name)   ← neighborhood→city grounding
// The deterministic catalog still covers every one of the 41,490 neighborhoods
// exactly; RAG only needs fuzzy coverage for the high-traffic cities.
//
// Output:
//   data/rag/location-grounding.embeddings.jsonl   one {id,type,...,vec} per line
//   data/rag/location-grounding.embeddings.meta.json
//
// Run: node scripts/rag/embed-location-grounding.mjs

import { readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'data/rag/niazfinder-grounding.rag.jsonl');
const OUT = path.join(ROOT, 'data/rag/location-grounding.embeddings.jsonl');
const META = path.join(ROOT, 'data/rag/location-grounding.embeddings.meta.json');
const EMBED_URL = (process.env.LOCAL_EMBED_URL || 'http://127.0.0.1:11434').replace(/\/$/, '').replace(/\/v1$/, '');
const MODEL = process.env.LOCAL_EMBED_MODEL || 'bge-m3';
const BATCH = 64;

const norm = (s) =>
  String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();

const MAJOR_CAPITALS = new Set(
  [
    'تهران', 'مشهد', 'اصفهان', 'کرج', 'شیراز', 'تبریز', 'اهواز', 'قم', 'کرمانشاه',
    'ارومیه', 'رشت', 'زاهدان', 'همدان', 'کرمان', 'یزد', 'اردبیل', 'بندرعباس', 'اراک',
    'اسلامشهر', 'زنجان', 'سنندج', 'قزوین', 'خرم آباد', 'گرگان', 'ساری', 'شهرکرد',
    'بوشهر', 'بیرجند', 'ایلام', 'قدس',
  ].map(norm),
);

function selectRecord(r) {
  if (r.type === 'province' || r.type === 'city' || r.type === 'category') return true;
  if (r.type === 'neighborhood') return MAJOR_CAPITALS.has(norm(r.city));
  return false;
}

async function embedChunk(texts, attempt = 0) {
  try {
    const res = await fetch(`${EMBED_URL}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = json.data;
    if (!rows?.length) throw new Error('no data');
    const out = new Array(texts.length);
    rows.forEach((row, i) => {
      out[typeof row.index === 'number' ? row.index : i] = row.embedding;
    });
    if (out.some((v) => !v)) throw new Error('missing embedding');
    return out;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      return embedChunk(texts, attempt + 1);
    }
    throw err;
  }
}

const round = (v) => Math.round(v * 1e6) / 1e6;

async function main() {
  const all = readFileSync(SRC, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const corpus = all.filter(selectRecord);
  const counts = corpus.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {});
  console.log(`Selected ${corpus.length} records to embed:`, counts);

  const stream = createWriteStream(OUT, { encoding: 'utf8' });
  let dims = 0;
  const t0 = Date.now();
  for (let i = 0; i < corpus.length; i += BATCH) {
    const batch = corpus.slice(i, i + BATCH);
    const vecs = await embedChunk(batch.map((r) => r.text));
    batch.forEach((r, j) => {
      const v = vecs[j];
      if (!dims) dims = v.length;
      const { text, ...meta } = r; // drop the long text; keep all metadata
      stream.write(JSON.stringify({ ...meta, vec: v.map(round) }) + '\n');
    });
    if ((i / BATCH) % 5 === 0 || i + BATCH >= corpus.length) {
      const done = Math.min(i + BATCH, corpus.length);
      const rate = done / ((Date.now() - t0) / 1000);
      console.log(`  ${done}/${corpus.length} (${rate.toFixed(0)}/s)`);
    }
  }
  await new Promise((res) => stream.end(res));

  const meta = {
    model: MODEL,
    dims,
    count: corpus.length,
    counts,
    builtFrom: path.relative(ROOT, SRC),
    builtAt: new Date().toISOString(),
    selection: 'all provinces+cities+categories + neighborhoods of major capitals',
  };
  writeFileSync(META, JSON.stringify(meta, null, 2));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(ROOT, OUT)} (dims=${dims})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
