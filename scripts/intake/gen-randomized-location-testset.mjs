// Augment the verified category testset (data/intake-testset/testset.json,
// 1058 cases / 106 leaves, already adversarially label-verified) with a
// RANDOM real city + neighborhood injected into each case's text, so the
// resulting set tests category AND location detection together, across every
// category and a random spread of real Iranian places.
//
// Output: data/intake-testset/testset-with-location.json
//   Each case keeps its original category label and gains expect.city /
//   expect.province / expect.neighborhood (neighborhood omitted ~40% of the
//   time, matching real-world need text that often names only a city).
//
// Run: node scripts/intake/gen-randomized-location-testset.mjs [sampleSize]

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const testset = JSON.parse(readFileSync(path.join(ROOT, 'data/intake-testset/testset.json'), 'utf8'));
const tree = JSON.parse(readFileSync(path.join(ROOT, 'src/data/iran-locations-tree.json'), 'utf8'));

// Deterministic PRNG (mulberry32) so re-runs are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260623);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const country = tree.countries[0];
const provinces = country.provinces;

// All real city names (longest-first) — used to detect a city ALREADY present
// in a base case's text, so we never inject a SECOND, contradictory city.
const norm = (s) => String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
// No length filter: exact word-boundary matching (below) already eliminates
// the false-positive risk short names would otherwise carry (e.g. "قم" only
// matches a standalone token, never a substring inside "میلیارد"). An earlier
// length>=3 cut wrongly dropped real 2-letter cities like قم from detection.
const ALL_CITY_NAMES = provinces
  .flatMap((p) => p.cities.map((c) => ({ name: c.name, province: p.name })))
  .sort((a, b) => b.name.length - a.name.length);

// Word-boundary match only — a raw substring search false-positives badly on
// short city names that are also substrings of common words (e.g. the city
// "ارد" matches inside "میلیارد" = "billion"). Split into tokens (drop
// punctuation/digits) and require an exact token (or, for multi-word city
// names, an exact consecutive-token) match.
function tokenize(text) {
  return norm(text)
    // includes Persian/Arabic comma (،), semicolon (؛) and decimal separator (٫)
    // alongside ASCII punctuation — a missed «،» was the bug that let "قم،"
    // survive as one token and dodge an exact-match check against "قم".
    .replace(/[.,!؟?؛:«»"'()\-/،٫]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function detectExistingCity(text) {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  for (const c of ALL_CITY_NAMES) {
    const nameTokens = norm(c.name).split(/\s+/).filter(Boolean);
    if (nameTokens.length === 1) {
      if (tokenSet.has(nameTokens[0])) return c;
    } else {
      // multi-word city name: require the exact consecutive sequence
      for (let i = 0; i <= tokens.length - nameTokens.length; i++) {
        if (nameTokens.every((w, j) => tokens[i + j] === w)) return c;
      }
    }
  }
  return null;
}

// City-only templates (never mention a neighborhood, even if one was picked).
const CITY_ONLY_PHRASES = [
  (city) => `در ${city}`,
  (city) => `تو ${city}`,
  (city) => `ساکن ${city} هستم`,
  (city) => `محدوده ${city}`,
];
// City+neighborhood templates — ALWAYS mention both, so expect.neighborhood
// is only ever set when the text actually names it (previously 4/6 templates
// silently dropped the neighborhood from the text while still expecting it —
// an unfair test of the engine for a place it was never told).
const CITY_HOOD_PHRASES = [
  (city, hood) => `در محله ${hood} ${city}`,
  (city, hood) => `${hood}، ${city}`,
];

function randomPlace() {
  const province = pick(provinces);
  const city = pick(province.cities);
  const candidates = (city.neighborhoods ?? []).filter((n) => n.name !== city.name);
  const hasHood = rand() > 0.4 && candidates.length > 0;
  const hood = hasHood ? pick(candidates) : null;
  return { province: province.name, city: city.name, neighborhood: hood?.name ?? null };
}

const args = process.argv.slice(2);
const sampleSize = args[0] ? parseInt(args[0], 10) : testset.cases.length;

// Stratified sample: shuffle then take first N, but guarantee at least one
// case per category leaf survives when N < total leaves' worth.
const bySlug = new Map();
for (const c of testset.cases) {
  const slug = c.expect.categorySlug;
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(c);
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let selected = [];
if (sampleSize >= testset.cases.length) {
  selected = testset.cases;
} else {
  // One random case per leaf first (full category coverage), then fill the rest randomly.
  const perLeaf = [...bySlug.values()].map((arr) => pick(arr));
  const remaining = shuffle(testset.cases.filter((c) => !perLeaf.includes(c)));
  selected = [...perLeaf, ...remaining].slice(0, sampleSize);
}

let skippedConflicts = 0;
const augmented = selected.map((c, i) => {
  const existing = detectExistingCity(c.text);
  if (existing) {
    // The base case already names a real city — injecting a different one
    // would create a contradictory text (e.g. "...تهران میرداماد...محدوده سمنان").
    // Trust the city already in the text; no neighborhood claim without NLP.
    skippedConflicts++;
    return {
      id: `${c.id}-loc${i}`,
      text: c.text,
      tone: c.tone,
      expect: {
        vertical: c.expect.vertical,
        categorySlug: c.expect.categorySlug,
        city: existing.name,
        province: existing.province,
        neighborhood: null,
      },
    };
  }
  const place = randomPlace();
  // Only ever pick a hood-aware template when a neighborhood was actually
  // chosen, so the text and expect.neighborhood always agree.
  const templates = place.neighborhood ? CITY_HOOD_PHRASES : CITY_ONLY_PHRASES;
  const phrase = pick(templates)(place.city, place.neighborhood);
  return {
    id: `${c.id}-loc${i}`,
    text: `${c.text} ${phrase}`,
    tone: c.tone,
    expect: {
      vertical: c.expect.vertical,
      categorySlug: c.expect.categorySlug,
      city: place.city,
      province: place.province,
      neighborhood: place.neighborhood,
    },
  };
});

const out = { version: 1, count: augmented.length, generatedAt: new Date(2026, 5, 23).toISOString(), cases: augmented };
writeFileSync(path.join(ROOT, 'data/intake-testset/testset-with-location.json'), JSON.stringify(out, null, 2));

const withHood = augmented.filter((c) => c.expect.neighborhood).length;
console.log(`Wrote ${augmented.length} cases → data/intake-testset/testset-with-location.json`);
console.log(`  category leaves covered: ${new Set(augmented.map((c) => c.expect.categorySlug)).size}`);
console.log(`  unique cities: ${new Set(augmented.map((c) => c.expect.city)).size}`);
console.log(`  cases with a neighborhood: ${withHood} (${Math.round((withHood / augmented.length) * 100)}%)`);
console.log(`  base text already named a city (kept as-is, no conflicting injection): ${skippedConflicts}`);
