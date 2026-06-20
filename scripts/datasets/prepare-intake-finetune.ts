#!/usr/bin/env npx tsx
/**
 * Unified fine-tune dataset preparation from smart-marketplace-clean.jsonl.
 *
 * Outputs:
 *   reports/intake-finetune-mlx-train.jsonl
 *   reports/intake-finetune-mlx-val.jsonl
 *   reports/intake-finetune-synthetic-train.jsonl
 *   reports/intake-finetune-synthetic-val.jsonl
 *   reports/intake-finetune-manifest.json
 */
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

import type { TrainingMessageRow } from '@/lib/need-intake/dataset/schema';

import {
  loadCategoryIndex,
  loadLocationIndex,
  normMatch,
  VALID_CATEGORY_SLUGS,
  type LocationIndex,
} from './finetune/catalog-index';
import {
  buildParseUserPrompt,
  PARSE_SYSTEM,
  syntheticToMlx,
  SYNTHETIC_SYSTEM_PROMPT,
} from './finetune/mlx-transform';
import {
  applyCategoryRules,
  rebuildCategories,
  shouldRemoveRecord,
  splitPayloadByCategory,
  userMentionsCity,
  type SyntheticPayload,
} from './finetune/rules';

const ROOT = join(import.meta.dirname, '../..');
const INPUT = join(ROOT, 'reports/smart-marketplace-clean.jsonl');
const REPORTS = join(ROOT, 'reports');

const SPLIT_SEED = 42;
const VAL_RATIO = 0.1;

interface ProcessedRow {
  user: string;
  synthetic: SyntheticPayload;
  splitKey: string;
}

interface Stats {
  sourceLines: number;
  rejected: Record<string, number>;
  edited: Record<string, number>;
  splitFromMulti: number;
  cityResolved: number;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveCityInText(
  user: string,
  payload: SyntheticPayload,
  locIdx: LocationIndex
): SyntheticPayload | null {
  if (payload.status !== 'ambiguous_location') return payload;
  const hoodName = payload.location.neighborhood;
  if (!hoodName) return payload;

  for (const opt of payload.options) {
    if (!userMentionsCity(user, opt.city)) continue;
    const hoodMap = locIdx.hoodByCity.get(opt.city) ?? locIdx.hoodByCity.get(normMatch(opt.city));
    if (!hoodMap) continue;

    const entry =
      hoodMap.get(hoodName) ??
      hoodMap.get(normMatch(hoodName)) ??
      locIdx.hoodLocations.get(hoodName)?.find((h) => h.city === opt.city) ??
      locIdx.hoodLocations.get(normMatch(hoodName))?.find((h) => h.city === opt.city);

    if (entry) {
      return {
        ...payload,
        status: 'resolved',
        location: {
          province: entry.province,
          city: entry.city,
          neighborhood: entry.neighborhood,
          cityId: entry.cityId,
          neighborhoodId: entry.neighborhoodId,
        },
        options: [],
      };
    }

    // city explicit but hood is city-level name
    if (normMatch(hoodName) === normMatch(opt.city)) {
      const cityMeta = locIdx.cityByName.get(opt.city);
      if (cityMeta) {
        return {
          ...payload,
          status: 'resolved',
          location: {
            province: cityMeta.province,
            city: cityMeta.city,
            neighborhood: cityMeta.city,
            cityId: cityMeta.cityId,
            neighborhoodId: cityMeta.cityId,
          },
          options: [],
        };
      }
    }
  }
  return payload;
}

function manualOverrides(user: string): SyntheticPayload | null {
  const overrides: Record<string, SyntheticPayload> = {
    'باطری ساعت تو شقاقی چورزق عوض کنن.': {
      location: {
        province: 'زنجان',
        city: 'چورزق',
        neighborhood: 'شقاقی چورزق',
        cityId: 'churzegh',
        neighborhoodId: 'شقاقی-چورزق',
      },
      categories: [],
      categorySlugs: ['watch-jewelry-repair'],
      status: 'resolved',
      options: [],
    },
    'موتور آب تو هریس سوخته، تکنسین.': {
      location: {
        province: 'آذربایجان شرقی',
        city: 'هریس',
        neighborhood: 'هریس',
        cityId: 'harris',
        neighborhoodId: 'هریس',
      },
      categories: [],
      categorySlugs: ['water-pump-repair'],
      status: 'resolved',
      options: [],
    },
    'باطری ساعت تو منطقه ۱۹ شهر تهران عوض کنن.': {
      location: {
        province: 'تهران',
        city: 'تهران',
        neighborhood: 'منطقه ۱۹ شهر تهران',
        cityId: 'tehran-city',
        neighborhoodId: 'منطقه-۱۹-شهر-تهران',
      },
      categories: [],
      categorySlugs: ['watch-jewelry-repair'],
      status: 'resolved',
      options: [],
    },
    'نظافت مسکن مهر سردشت، پایان کار.': {
      location: {
        province: 'آذربایجان غربی',
        city: 'سردشت',
        neighborhood: 'مسکن مهر سردشت',
        cityId: 'sardasht',
        neighborhoodId: 'مسکن-مهر-سردشت',
      },
      categories: [],
      categorySlugs: ['cleaning'],
      status: 'resolved',
      options: [],
    },
  };
  return overrides[user] ?? null;
}

function processPayload(
  user: string,
  raw: SyntheticPayload,
  locIdx: LocationIndex,
  catIndex: ReturnType<typeof loadCategoryIndex>,
  stats: Stats
): ProcessedRow[] | null {
  const override = manualOverrides(user);
  let payload: SyntheticPayload = override ? { ...override } : { ...raw, options: [...(raw.options ?? [])] };

  const removeReason = shouldRemoveRecord(user, raw.status ?? 'resolved');
  if (removeReason) {
    stats.rejected[removeReason] = (stats.rejected[removeReason] ?? 0) + 1;
    return null;
  }

  if (payload.status === 'missing_intent') {
    stats.rejected.missing_intent = (stats.rejected.missing_intent ?? 0) + 1;
    return null;
  }

  const beforeStatus = payload.status;
  const resolved = resolveCityInText(user, payload, locIdx);
  if (resolved && resolved.status === 'resolved' && beforeStatus === 'ambiguous_location') {
    payload = resolved;
    stats.cityResolved += 1;
    stats.edited.city_in_text = (stats.edited.city_in_text ?? 0) + 1;
  }

  let slugs = applyCategoryRules(user, payload.categorySlugs ?? [], catIndex);
  if (JSON.stringify(slugs) !== JSON.stringify(payload.categorySlugs)) {
    stats.edited.category_rules = (stats.edited.category_rules ?? 0) + 1;
  }

  slugs = slugs.filter((s) => VALID_CATEGORY_SLUGS.has(s) || s.endsWith('-repair'));
  if (slugs.length === 0) {
    stats.rejected.invalid_category = (stats.rejected.invalid_category ?? 0) + 1;
    return null;
  }

  payload.categorySlugs = slugs;
  payload.categories = rebuildCategories(slugs, catIndex);

  if (payload.status === 'resolved') {
    if (!payload.location.cityId || !payload.location.neighborhoodId) {
      stats.rejected.resolved_missing_ids = (stats.rejected.resolved_missing_ids ?? 0) + 1;
      return null;
    }
  }

  if (payload.status === 'ambiguous_location') {
    if ((payload.options?.length ?? 0) < 2) {
      stats.rejected.ambiguous_bad_options = (stats.rejected.ambiguous_bad_options ?? 0) + 1;
      return null;
    }
  }

  const splits = splitPayloadByCategory(payload);
  if (splits.length > 1) {
    stats.splitFromMulti += splits.length - 1;
  }

  return splits.map((s) => ({
    user,
    synthetic: s,
    splitKey: `${s.status}:${s.categorySlugs[0]}`,
  }));
}

function toSyntheticRow(user: string, payload: SyntheticPayload): TrainingMessageRow {
  return {
    messages: [
      { role: 'system', content: SYNTHETIC_SYSTEM_PROMPT },
      { role: 'user', content: user },
      {
        role: 'assistant',
        content: JSON.stringify(payload),
      },
    ],
  };
}

function toMlxRow(user: string, payload: SyntheticPayload): TrainingMessageRow {
  const leaf = payload.categorySlugs[0];
  const labels = syntheticToMlx(user, payload, leaf);
  return {
    messages: [
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user', content: buildParseUserPrompt(user, leaf) },
      {
        role: 'assistant',
        content: JSON.stringify(labels),
      },
    ],
  };
}

function stratifiedSplit(rows: ProcessedRow[]): { train: ProcessedRow[]; val: ProcessedRow[] } {
  const rng = mulberry32(SPLIT_SEED);
  const buckets = new Map<string, ProcessedRow[]>();
  for (const row of rows) {
    const list = buckets.get(row.splitKey) ?? [];
    list.push(row);
    buckets.set(row.splitKey, list);
  }

  const train: ProcessedRow[] = [];
  const val: ProcessedRow[] = [];
  const seenUserCat = new Set<string>();

  for (const [, bucket] of buckets) {
    for (const row of bucket) {
      const dedupeKey = `${row.user}\0${row.synthetic.categorySlugs[0]}`;
      if (seenUserCat.has(dedupeKey)) continue;
      seenUserCat.add(dedupeKey);

      if (rng() < VAL_RATIO) val.push(row);
      else train.push(row);
    }
  }

  return { train, val };
}

async function main(): Promise<void> {
  const catIndex = loadCategoryIndex();
  const locIdx = loadLocationIndex();
  const stats: Stats = {
    sourceLines: 0,
    rejected: {},
    edited: {},
    splitFromMulti: 0,
    cityResolved: 0,
  };

  const processed: ProcessedRow[] = [];

  const rl = createInterface({
    input: createReadStream(INPUT, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    stats.sourceLines += 1;

    try {
      const rec = JSON.parse(line) as TrainingMessageRow;
      const user = rec.messages[1]?.content ?? '';
      const assistantRaw = JSON.parse(rec.messages[2]?.content ?? '{}') as SyntheticPayload;
      const rows = processPayload(user, assistantRaw, locIdx, catIndex, stats);
      if (rows) processed.push(...rows);
    } catch {
      stats.rejected.parse_error = (stats.rejected.parse_error ?? 0) + 1;
    }

    if (stats.sourceLines % 100_000 === 0) {
      console.log(`  scanned ${stats.sourceLines.toLocaleString()}...`);
    }
  }

  const { train, val } = stratifiedSplit(processed);

  mkdirSync(REPORTS, { recursive: true });

  const writeJsonl = (path: string, rows: ProcessedRow[], mapper: (r: ProcessedRow) => TrainingMessageRow) => {
    const lines = rows.map((r) => JSON.stringify(mapper(r)));
    writeFileSync(path, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
  };

  writeJsonl(join(REPORTS, 'intake-finetune-synthetic-train.jsonl'), train, (r) =>
    toSyntheticRow(r.user, r.synthetic)
  );
  writeJsonl(join(REPORTS, 'intake-finetune-synthetic-val.jsonl'), val, (r) =>
    toSyntheticRow(r.user, r.synthetic)
  );
  writeJsonl(join(REPORTS, 'intake-finetune-mlx-train.jsonl'), train, (r) => toMlxRow(r.user, r.synthetic));
  writeJsonl(join(REPORTS, 'intake-finetune-mlx-val.jsonl'), val, (r) => toMlxRow(r.user, r.synthetic));

  const statusCounts: Record<string, number> = {};
  for (const r of processed) {
    statusCounts[r.synthetic.status] = (statusCounts[r.synthetic.status] ?? 0) + 1;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: INPUT,
    summary: {
      sourceLines: stats.sourceLines,
      accepted: processed.length,
      rejected: Object.values(stats.rejected).reduce((a, b) => a + b, 0),
      train: train.length,
      val: val.length,
      splitFromMulti: stats.splitFromMulti,
      cityResolved: stats.cityResolved,
      status: statusCounts,
    },
    rejected: stats.rejected,
    edited: stats.edited,
    outputs: {
      mlxTrain: join(REPORTS, 'intake-finetune-mlx-train.jsonl'),
      mlxVal: join(REPORTS, 'intake-finetune-mlx-val.jsonl'),
      syntheticTrain: join(REPORTS, 'intake-finetune-synthetic-train.jsonl'),
      syntheticVal: join(REPORTS, 'intake-finetune-synthetic-val.jsonl'),
    },
  };

  writeFileSync(join(REPORTS, 'intake-finetune-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('Source lines:', stats.sourceLines.toLocaleString());
  console.log('Accepted:', processed.length.toLocaleString());
  console.log('Train:', train.length.toLocaleString(), '| Val:', val.length.toLocaleString());
  console.log('Manifest ->', join(REPORTS, 'intake-finetune-manifest.json'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
