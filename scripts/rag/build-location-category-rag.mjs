// Build a complete RAG corpus (JSONL) for NiazFinder location + category grounding.
//
// Sources (authoritative, generated upstream):
//   src/data/iran-locations-tree.json   — 31 provinces / 1207 cities / 41,490 neighborhoods
//   src/data/iran-categories-tree.json  — full category tree (roots → leaves)
//
// Output: data/rag/niazfinder-grounding.rag.jsonl
//   One retrievable record per province / city / neighborhood / category. Each line:
//   { id, type, name, nameEn, aliases[], province?, provinceId?, city?, cityId?,
//     path?, slug?, depth?, text }
//   `text` is the embeddable chunk — Persian + finglish + parent context, written so a
//   model can map a mention back to the correct city + province (e.g. نارمک → تهران).
//
// Run: node scripts/rag/build-location-category-rag.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOC = JSON.parse(readFileSync(path.join(ROOT, 'src/data/iran-locations-tree.json'), 'utf8'));
const CAT = JSON.parse(readFileSync(path.join(ROOT, 'src/data/iran-categories-tree.json'), 'utf8'));
const OUT_DIR = path.join(ROOT, 'data/rag');
const OUT_FILE = path.join(OUT_DIR, 'niazfinder-grounding.rag.jsonl');

// ── Persian normalization for an alias variant (Arabic yeh/kaf → Persian, drop ZWNJ) ──
function normFa(s) {
  return String(s || '')
    .replace(/ي/g, 'ی') // ي → ی
    .replace(/ك/g, 'ک') // ك → ک
    .replace(/‌/g, ' ') // ZWNJ → space
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasesFor(name, nameEn) {
  const set = new Set();
  for (const v of [name, nameEn, normFa(name)]) {
    const t = String(v || '').trim();
    if (t) set.add(t);
  }
  return [...set];
}

const lines = [];
const counts = { province: 0, city: 0, neighborhood: 0, category: 0 };

function push(rec) {
  counts[rec.type] = (counts[rec.type] || 0) + 1;
  lines.push(JSON.stringify(rec));
}

// ── Locations ──
const country = LOC.countries?.[0];
for (const prov of country?.provinces ?? []) {
  const cities = prov.cities ?? [];
  const sampleCities = cities.slice(0, 24).map((c) => c.name).join('، ');
  push({
    id: `loc:province:${prov.id}`,
    type: 'province',
    name: prov.name,
    nameEn: prov.nameEn ?? null,
    aliases: aliasesFor(prov.name, prov.nameEn),
    cityCount: prov.cityCount ?? cities.length,
    text:
      `استان ${prov.name}${prov.nameEn ? ` (${prov.nameEn})` : ''}، یکی از استان‌های ایران. ` +
      `این استان ${prov.cityCount ?? cities.length} شهر دارد، از جمله: ${sampleCities}. ` +
      `اگر کاربر یکی از این شهرها را نام ببرد، استان = ${prov.name}.`,
  });

  for (const city of cities) {
    const hoods = city.neighborhoods ?? [];
    const sampleHoods = hoods.slice(0, 14).map((n) => n.name).join('، ');
    push({
      id: `loc:city:${prov.id}:${city.id}`,
      type: 'city',
      name: city.name,
      nameEn: city.nameEn ?? null,
      aliases: aliasesFor(city.name, city.nameEn),
      province: prov.name,
      provinceId: prov.id,
      neighborhoodCount: city.neighborhoodCount ?? hoods.length,
      text:
        `شهر ${city.name}${city.nameEn ? ` (${city.nameEn})` : ''} در استان ${prov.name}. ` +
        `اگر در متن «${city.name}» به‌عنوان مکان بیاید، شهر = ${city.name} و استان = ${prov.name}.` +
        (sampleHoods ? ` محله‌های نمونه: ${sampleHoods}.` : ''),
    });

    for (const hood of hoods) {
      push({
        id: `loc:hood:${prov.id}:${city.id}:${hood.id}`,
        type: 'neighborhood',
        name: hood.name,
        nameEn: hood.nameEn && hood.nameEn !== hood.name ? hood.nameEn : null,
        aliases: aliasesFor(hood.name, hood.nameEn),
        city: city.name,
        cityId: city.id,
        province: prov.name,
        provinceId: prov.id,
        text:
          `محله «${hood.name}» در شهر ${city.name}، استان ${prov.name}. ` +
          `اگر کاربر «${hood.name}» را بنویسد، این محله در ${city.name} (${prov.name}) قرار دارد.`,
      });
    }
  }
}

// ── Categories (recursive, full path from root) ──
function walkCat(node, trail) {
  const path_ = [...trail, node.nameFa];
  const isLeaf = !node.children || node.children.length === 0;
  push({
    id: `cat:${node.slug}`,
    type: 'category',
    name: node.nameFa,
    nameEn: node.nameEn ?? null,
    slug: node.slug,
    depth: node.depth,
    isLeaf,
    path: path_.join(' > '),
    aliases: aliasesFor(node.nameFa, node.nameEn),
    text:
      `دسته‌بندی${isLeaf ? ' (برگ)' : ''}: ${path_.join(' › ')}. ` +
      `نام: ${node.nameFa}${node.nameEn ? ` (${node.nameEn})` : ''}. اسلاگ: ${node.slug}.`,
  });
  for (const child of node.children ?? []) walkCat(child, path_);
}
for (const root of CAT.categories ?? []) walkCat(root, []);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');

const total = lines.length;
console.log(`Wrote ${total} records → ${path.relative(ROOT, OUT_FILE)}`);
console.log(
  `  provinces=${counts.province}  cities=${counts.city}  neighborhoods=${counts.neighborhood}  categories=${counts.category}`,
);
