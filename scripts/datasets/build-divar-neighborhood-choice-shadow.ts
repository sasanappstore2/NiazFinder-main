#!/usr/bin/env bun
/**
 * Build a local-only, city-scoped neighborhood choice corpus with positive and
 * unknown examples. Labels are weak seller-side geotag/text evidence, never
 * authentic seeker intent or production training data.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import path from 'node:path';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import {
  loadCityCatalogFile,
  loadCityNeighborhoods,
  resolveCatalogCityIdCandidates,
} from '@/lib/neighborhoods/catalog';
import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';
import { inspectNeighborhoodCandidateDecision } from './build-divar-neighborhood-candidate-corpus';

const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const SOURCE_SHA256 = 'e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f';
const SOURCE_FACTS =
  'data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl';
const SOURCE_MANIFEST = `${SOURCE_FACTS}.manifest.json`;
const DEFAULT_OUTPUT =
  'data/divar/divar-neighborhood-choice-shadow-v2-balanced-2026-09-28.jsonl';
const MAX_CANDIDATES = 8;
const UNKNOWN_POOL_PER_CITY_SPLIT = 128;
const UNKNOWN_MAX_PER_CITY_SPLIT = 64;
const UNKNOWN_MIN_PER_CITY_SPLIT = 8;
const TASK_TYPE = 'divar-neighborhood-choice-shadow/v2';

type JsonObject = Record<string, unknown>;

export type FactRow = {
  state?: string;
  split?: string;
  source?: {
    dataset?: string;
    datasetSha256?: string;
    rowOrdinal?: number;
    normalizedTextGroupSha256?: string;
  };
  offerLocation?: {
    appCitySlug?: string | null;
    appNeighborhoodId?: string | null;
    neighborhoodMatch?: string | null;
  };
};

type Catalog = {
  cityName: string;
  rows: ManagedNeighborhood[];
  byId: Map<string, ManagedNeighborhood>;
};

type GroupFacts = { targets: Set<string>; splits: Set<string> };
type RankedFact = { rank: string; row: FactRow; group: string; city: string; split: string };
type OutputRow = {
  schemaVersion: 2;
  taskType: typeof TASK_TYPE;
  exampleId: string;
  state: { text: string; context: { city: string; neighborhood_candidates: Array<{ slug: string; name: string }> } };
  questions: { neighborhood_candidate: { type: 'choice'; instructions: string; criteria: Record<string, string> } };
  targetDecisions: { neighborhood_candidate: { value: string; source: string } };
  source: {
    dataset: string;
    datasetSha256: string;
    rowOrdinal: number;
    normalizedTextGroupSha256: string;
    split: string;
    perspective: 'seller_or_agent_supply_offer';
    offerNeighborhoodMatch: 'exact_official_crosswalk';
  };
  provenance: {
    derived: true;
    sourceTextSynthetic: false;
    realNeedGroundTruth: false;
    humanReviewed: false;
    trainingEligible: false;
    cloudTransferAllowed: false;
    labelKind: 'weak_positive_text_grounded' | 'weak_unknown_no_catalog_match';
  };
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseArgs(argv: string[]): { input: string; manifest: string; output: string } {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' || arg === '--manifest' || arg === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      values.set(arg, value);
      i += 1;
    } else if (arg === '--help') {
      console.log(
        'Usage: bun scripts/datasets/build-divar-neighborhood-choice-shadow.ts [--input facts.jsonl] [--manifest facts.jsonl.manifest.json] [--output new-shadow.jsonl]',
      );
      process.exit(0);
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  const input = path.resolve(values.get('--input') ?? SOURCE_FACTS);
  const manifest = path.resolve(values.get('--manifest') ?? SOURCE_MANIFEST);
  const output = path.resolve(values.get('--output') ?? DEFAULT_OUTPUT);
  if (input === output || manifest === output) throw new Error('Input and output paths must differ.');
  return { input, manifest, output };
}

function isExactMappedRow(row: FactRow): boolean {
  return (
    row.source?.dataset === SOURCE_DATASET &&
    row.source.datasetSha256 === SOURCE_SHA256 &&
    typeof row.source.normalizedTextGroupSha256 === 'string' &&
    row.source.normalizedTextGroupSha256.length === 64 &&
    Number.isInteger(row.source.rowOrdinal) && row.source.rowOrdinal! >= 0 &&
    typeof row.state === 'string' && row.state.trim().length > 0 &&
    row.split !== undefined && ['train', 'calibration', 'test'].includes(row.split) &&
    typeof row.offerLocation?.appCitySlug === 'string' &&
    typeof row.offerLocation.appNeighborhoodId === 'string' &&
    row.offerLocation.neighborhoodMatch === 'exact_official_crosswalk'
  );
}

export function compactLocationKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[يى]/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/[ۀة]/gu, 'ه')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
    .replace(/[\u200c\u200e\u200f\s\p{P}\p{S}]/gu, '')
    .toLowerCase();
}

export function labelAppearsInText(neighborhood: ManagedNeighborhood, text: string): boolean {
  const normalizedText = compactLocationKey(text);
  const labels = [
    neighborhood.name,
    neighborhood.name.replace(/^(?:شهید|سید|آیت\s+الله)\s+/u, ''),
    ...(neighborhood.areas ?? []),
  ];
  return labels.some((label) => {
    const key = compactLocationKey(label);
    return key.length >= 3 && normalizedText.includes(key);
  });
}

export function unknownQuota(positiveCount: number): number {
  if (!Number.isInteger(positiveCount) || positiveCount < 0) {
    throw new RangeError('Positive example count must be a non-negative integer.');
  }
  return Math.min(UNKNOWN_MAX_PER_CITY_SPLIT, Math.max(UNKNOWN_MIN_PER_CITY_SPLIT, positiveCount * 2));
}

// Kept local rather than depending on a broad geo parser: only the specific
// between-place construction makes a single-neighborhood target ambiguous.
export function textDescribesBetweenPlaces(text: string): boolean {
  return /(?:^|\s)(?:بین|میان)\s+.{1,60}?\s+(?:و|تا)\s+.{1,60}(?:$|[،,.\s])/u.test(text);
}

function safeUnknownDistractors(
  catalog: Catalog,
  text: string,
  group: string,
  sourceNeighborhoodId: string,
): ManagedNeighborhood[] {
  return catalog.rows
    .filter((item) => item.id !== sourceNeighborhoodId && !labelAppearsInText(item, text))
    .map((item) => ({ item, rank: sha256(`${group}:distractor:${item.id}`) }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .slice(0, MAX_CANDIDATES - 1)
    .map(({ item }) => item);
}

function describeCandidate(neighborhood: ManagedNeighborhood): string {
  const aliases = [...new Set((neighborhood.areas ?? []).map((value) => value.trim()).filter(Boolean))]
    .slice(0, 3)
    .map((value) => value.slice(0, 48));
  const suffix = aliases.length ? `؛ نام‌های محدوده: ${aliases.join('، ')}` : '';
  return `محلهٔ ${neighborhood.name}${suffix}`;
}

export function makeUnknownDecision(
  catalog: Catalog,
  text: string,
  group: string,
  sourceNeighborhoodId: string,
): { candidateIds: string[]; criteria: Record<string, string> } | null {
  const resolution = resolveTextNeighborhoodInCity(catalog.rows, text, catalog.cityName);
  if (resolution.hit || resolution.candidates.length > 0 || textDescribesBetweenPlaces(text)) return null;
  const distractors = safeUnknownDistractors(catalog, text, group, sourceNeighborhoodId);
  if (distractors.length < 2) return null;
  return {
    candidateIds: distractors.map((item) => item.id),
    criteria: {
      ...Object.fromEntries(distractors.map((item) => [item.id, describeCandidate(item)])),
      unknown: 'در متن اشارهٔ روشن و یکتایی به هیچ‌یک از این محله‌ها نشده است؛ حدس نزن.',
    },
  };
}

function readAndValidateSourceManifest(filePath: string): JsonObject {
  const manifest = JSON.parse(readFileSync(filePath, 'utf8')) as JsonObject;
  if (
    manifest.dataset !== SOURCE_DATASET ||
    manifest.datasetSha256 !== SOURCE_SHA256 ||
    manifest.targetTask !== 'divar-property-offer-facts/v2' ||
    manifest.containsSyntheticData !== false ||
    manifest.cloudTransferAllowed !== false ||
    typeof manifest.outputRows !== 'number' ||
    manifest.neighborhoodCrosswalk !==
      'data/divar/official-neighborhood-app-crosswalk-2026-09-28-legacy-aliases.json'
  ) {
    throw new Error('Source manifest does not match the reviewed local-only v4 facts snapshot.');
  }
  return manifest;
}

async function managedCatalog(citySlug: string): Promise<Catalog> {
  const rows = await loadCityNeighborhoods(citySlug);
  let cityName = citySlug;
  for (const catalogCityId of resolveCatalogCityIdCandidates(citySlug)) {
    const catalogFile = await loadCityCatalogFile(catalogCityId);
    if (catalogFile?.cityName?.trim()) {
      cityName = catalogFile.cityName.trim();
      break;
    }
  }
  return { cityName, rows, byId: new Map(rows.map((item) => [item.id, item])) };
}

async function* readJsonl(filePath: string): AsyncGenerator<FactRow> {
  const lines = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSONL at line ${lineNumber}.`);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Expected a JSON object at line ${lineNumber}.`);
    }
    yield value as FactRow;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) digest.update(chunk as Buffer);
  return digest.digest('hex');
}

async function writeLine(writer: NodeJS.WritableStream, value: unknown): Promise<void> {
  if (!writer.write(`${JSON.stringify(value)}\n`)) await once(writer, 'drain');
}

function makeOutputRow(
  row: FactRow,
  group: string,
  citySlug: string,
  candidateIds: string[],
  criteria: Record<string, string>,
  target: string,
  targetSource: string,
  catalog: Catalog,
): OutputRow {
  const neighborhoods = candidateIds.map((id) => ({
    slug: id,
    name: catalog.byId.get(id)?.name ?? id,
  }));
  const cityName = catalog.cityName;
  return {
    schemaVersion: 2,
    taskType: TASK_TYPE,
    exampleId: sha256(`${group}:${citySlug}:${target}:${targetSource}`),
    state: {
      text: row.state!,
      context: { city: citySlug, neighborhood_candidates: neighborhoods },
    },
    questions: {
      neighborhood_candidate: {
        type: 'choice',
        instructions:
          `شهرِ زمینه ${cityName} است. فقط وقتی متن صریحاً به یکی از محله‌های گزینه‌ها اشاره می‌کند همان را برگزین؛ در نبود اشارهٔ روشن یا در صورت ابهام، unknown را انتخاب کن.`,
        criteria,
      },
    },
    targetDecisions: {
      neighborhood_candidate: { value: target, source: targetSource },
    },
    source: {
      dataset: SOURCE_DATASET,
      datasetSha256: SOURCE_SHA256,
      rowOrdinal: row.source!.rowOrdinal!,
      normalizedTextGroupSha256: group,
      split: row.split!,
      perspective: 'seller_or_agent_supply_offer',
      offerNeighborhoodMatch: 'exact_official_crosswalk',
    },
    provenance: {
      derived: true,
      sourceTextSynthetic: false,
      realNeedGroundTruth: false,
      humanReviewed: false,
      trainingEligible: false,
      cloudTransferAllowed: false,
      labelKind: target === 'unknown' ? 'weak_unknown_no_catalog_match' : 'weak_positive_text_grounded',
    },
  };
}

function retainLowestRank(bucket: RankedFact[], candidate: RankedFact, limit: number): void {
  if (bucket.length < limit) {
    bucket.push(candidate);
    return;
  }
  let worstIndex = 0;
  for (let i = 1; i < bucket.length; i += 1) {
    if (bucket[i]!.rank > bucket[worstIndex]!.rank) worstIndex = i;
  }
  if (candidate.rank < bucket[worstIndex]!.rank) bucket[worstIndex] = candidate;
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const values = new Map<string, string>();
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' || arg === '--manifest' || arg === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      values.set(arg, value);
      i += 1;
    } else if (arg === '--help') {
      console.log('Use --input, --manifest, and --output; existing outputs are never overwritten.');
      process.exit(0);
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  const input = path.resolve(values.get('--input') ?? SOURCE_FACTS);
  const sourceManifestPath = path.resolve(values.get('--manifest') ?? SOURCE_MANIFEST);
  const output = path.resolve(values.get('--output') ?? DEFAULT_OUTPUT);
  if (input === output || sourceManifestPath === output || !existsSync(input) || !existsSync(sourceManifestPath)) {
    throw new Error('Pinned facts input/manifest must exist and output must be a different path.');
  }
  if (existsSync(output) || existsSync(`${output}.manifest.json`)) {
    throw new Error('Refusing to overwrite an existing neighborhood choice artifact.');
  }
  const sourceManifest = readAndValidateSourceManifest(sourceManifestPath);
  const inputSha256 = await sha256File(input);
  const sourceManifestSha256 = await sha256File(sourceManifestPath);
  const groups = new Map<string, GroupFacts>();
  let sourceRowsRead = 0;
  let exactMappedRows = 0;
  for await (const row of readJsonl(input)) {
    sourceRowsRead += 1;
    if (sourceRowsRead % 100_000 === 0) {
      console.error(`phase=group-audit rows=${sourceRowsRead} exactMapped=${exactMappedRows}`);
    }
    if (!isExactMappedRow(row)) continue;
    exactMappedRows += 1;
    const group = row.source!.normalizedTextGroupSha256!;
    const target = `${row.offerLocation!.appCitySlug}\u0000${row.offerLocation!.appNeighborhoodId}`;
    const current = groups.get(group) ?? { targets: new Set<string>(), splits: new Set<string>() };
    current.targets.add(target);
    current.splits.add(row.split!);
    groups.set(group, current);
  }
  if (sourceRowsRead !== sourceManifest.outputRows) {
    throw new Error(`Source row count mismatch: read ${sourceRowsRead}, expected ${sourceManifest.outputRows}.`);
  }
  const conflictingGroups = new Set(
    [...groups].filter(([, facts]) => facts.targets.size !== 1 || facts.splits.size !== 1).map(([group]) => group),
  );

  const seenGroups = new Set<string>();
  const catalogs = new Map<string, Promise<Catalog>>();
  const positiveRows: OutputRow[] = [];
  const positivesByCitySplit = new Map<string, number>();
  const unknownPool = new Map<string, RankedFact[]>();
  const counts = {
    uniqueMappedGroups: groups.size,
    conflictingOrCrossSplitGroups: conflictingGroups.size,
    positiveTextGrounded: 0,
    unknownCandidatesConsidered: 0,
    unknownRejectedForMentionOrAmbiguity: 0,
    unknownRejectedForInsufficientCatalog: 0,
    missingCatalog: 0,
    deterministicUniqueMatchesSkipped: 0,
    betweenPlacesSkipped: 0,
    positiveTargetNotCandidate: 0,
    positiveCandidateOverflow: 0,
  };
  const catalogFor = (city: string): Promise<Catalog> => {
    let result = catalogs.get(city);
    if (!result) {
      result = managedCatalog(city);
      catalogs.set(city, result);
    }
    return result;
  };

  let uniqueMappedProcessed = 0;
  for await (const row of readJsonl(input)) {
    if (!isExactMappedRow(row)) continue;
    const source = row.source!;
    const group = source.normalizedTextGroupSha256!;
    if (conflictingGroups.has(group) || seenGroups.has(group)) continue;
    seenGroups.add(group);
    uniqueMappedProcessed += 1;
    if (uniqueMappedProcessed % 50_000 === 0) {
      console.error(`phase=positive-and-unknown-reservoir groups=${uniqueMappedProcessed} positives=${positiveRows.length}`);
    }
    const citySlug = row.offerLocation!.appCitySlug!;
    const targetId = row.offerLocation!.appNeighborhoodId!;
    const catalog = await catalogFor(citySlug);
    if (!catalog.rows.length) {
      counts.missingCatalog += 1;
      continue;
    }
    const targetNeighborhood = catalog.byId.get(targetId);
    const inspection = inspectNeighborhoodCandidateDecision(
      catalog.rows, row.state!, catalog.cityName, targetId, targetNeighborhood,
    );
    if (inspection.status === 'eligible') {
      const decision = inspection.decision;
      positiveRows.push(makeOutputRow(
        row, group, citySlug, decision.candidateIds, decision.question.criteria,
        targetId, 'weak_exact_crosswalk_plus_explicit_text_candidate', catalog,
      ));
      counts.positiveTextGrounded += 1;
      const key = `${citySlug}\u0000${row.split!}`;
      positivesByCitySplit.set(key, (positivesByCitySplit.get(key) ?? 0) + 1);
      continue;
    }
    if (inspection.status === 'unique_rule_match') counts.deterministicUniqueMatchesSkipped += 1;
    if (inspection.status === 'between_places') counts.betweenPlacesSkipped += 1;
    if (inspection.status === 'target_not_candidate') counts.positiveTargetNotCandidate += 1;
    if (inspection.status === 'candidate_overflow') counts.positiveCandidateOverflow += 1;

    if (!targetNeighborhood || labelAppearsInText(targetNeighborhood, row.state!) || textDescribesBetweenPlaces(row.state!)) {
      continue;
    }
    const key = `${citySlug}\u0000${row.split!}`;
    const bucket = unknownPool.get(key) ?? [];
    retainLowestRank(bucket, {
      rank: sha256(`${group}:unknown-reservoir:${citySlug}:${row.split}`),
      row,
      group,
      city: citySlug,
      split: row.split!,
    }, UNKNOWN_POOL_PER_CITY_SPLIT);
    unknownPool.set(key, bucket);
  }

  const unknownRows: OutputRow[] = [];
  let unknownInspected = 0;
  for (const [key, bucket] of [...unknownPool].sort(([a], [b]) => a.localeCompare(b))) {
    const [citySlug, split] = key.split('\u0000');
    if (!citySlug || !split) continue;
    const catalog = await catalogFor(citySlug);
    const positiveCount = positivesByCitySplit.get(key) ?? 0;
    const quota = unknownQuota(positiveCount);
    bucket.sort((a, b) => a.rank.localeCompare(b.rank));
    let accepted = 0;
    for (const candidate of bucket) {
      if (accepted >= quota) break;
      unknownInspected += 1;
      if (unknownInspected % 2_000 === 0) {
        console.error(`phase=unknown-validation inspected=${unknownInspected} accepted=${unknownRows.length}`);
      }
      counts.unknownCandidatesConsidered += 1;
      const row = candidate.row;
      const targetId = row.offerLocation!.appNeighborhoodId!;
      const decision = makeUnknownDecision(catalog, row.state!, candidate.group, targetId);
      if (!decision) {
        counts.unknownRejectedForMentionOrAmbiguity += 1;
        continue;
      }
      if (decision.candidateIds.length < 2) {
        counts.unknownRejectedForInsufficientCatalog += 1;
        continue;
      }
      unknownRows.push(makeOutputRow(
        row, candidate.group, citySlug, decision.candidateIds, decision.criteria,
        'unknown', 'weak_city_scoped_resolver_found_no_catalog_candidate', catalog,
      ));
      accepted += 1;
    }
  }

  const outputCounts = {
    outputRowsBySplit: { train: 0, calibration: 0, test: 0 } as Record<string, number>,
    outputRowsByLabelKind: { weak_positive_text_grounded: 0, weak_unknown_no_catalog_match: 0 },
    outputRowsByCandidateCount: {} as Record<string, number>,
    outputRowsByCity: {} as Record<string, { total: number; positive: number; unknown: number }>,
  };
  const tempPath = `${output}.tmp`;
  const writer = createWriteStream(tempPath, { flags: 'wx' });
  const outputHash = createHash('sha256');
  let outputBytes = 0;
  let outputRows = 0;
  try {
    for (const row of [...positiveRows, ...unknownRows]) {
      const line = `${JSON.stringify(row)}\n`;
      outputHash.update(line);
      outputBytes += Buffer.byteLength(line);
      await writeLine(writer, row);
      outputRows += 1;
      outputCounts.outputRowsBySplit[row.source.split as keyof typeof outputCounts.outputRowsBySplit] += 1;
      outputCounts.outputRowsByLabelKind[row.provenance.labelKind] += 1;
      const candidateCount = String(row.state.context.neighborhood_candidates.length);
      outputCounts.outputRowsByCandidateCount[candidateCount] =
        (outputCounts.outputRowsByCandidateCount[candidateCount] ?? 0) + 1;
      const city = row.state.context.city;
      const cityCount = outputCounts.outputRowsByCity[city] ?? { total: 0, positive: 0, unknown: 0 };
      cityCount.total += 1;
      cityCount[row.provenance.labelKind === 'weak_positive_text_grounded' ? 'positive' : 'unknown'] += 1;
      outputCounts.outputRowsByCity[city] = cityCount;
    }
    writer.end();
    await once(writer, 'finish');
  } catch (error) {
    writer.destroy();
    throw error;
  }

  const outputSha256 = outputHash.digest('hex');
  const outputManifest = {
    schemaVersion: 2,
    taskType: TASK_TYPE,
    status: 'complete_shadow_only',
    createdAt: startedAt,
    input: path.relative(process.cwd(), input),
    inputManifest: path.relative(process.cwd(), sourceManifestPath),
    inputSha256,
    sourceManifestSha256,
    inputRows: sourceRowsRead,
    outputRows,
    outputBytes,
    outputSha256,
    source: SOURCE_DATASET,
    sourceSha256: SOURCE_SHA256,
    sourcePerspective: 'seller_or_agent_supply_offer_not_seeker_demand',
    labelPolicy: 'exact-geotag text-grounded weak positives plus city-scoped zero-candidate unknowns with absent distractor labels; not human truth',
    candidatePolicy: '2-8 city-scoped catalog choices plus unknown; negative distractors are deterministic and verified absent from each selected source text',
    splitPolicy: 'preserve source normalized-text-group train/calibration/test split; conflicts excluded; deterministic per-city split sampling',
    limits: {
      unknownQuotaPerCitySplit: 'max(8, 2 * weak-positive count), capped at 64; cities/splits without positives receive at most 8',
      unknownCandidateReservoirPerCitySplit: UNKNOWN_POOL_PER_CITY_SPLIT,
      actualSourceCityCatalogs: Object.keys(outputCounts.outputRowsByCity).length,
      taskCoverage: 'unresolved explicit neighborhood mentions and safe no-catalog-match abstention only; deterministic unique resolver hits are excluded',
    },
    counts: {
      ...counts,
      outputRowsBySplit: outputCounts.outputRowsBySplit,
      outputRowsByLabelKind: outputCounts.outputRowsByLabelKind,
      outputRowsByCandidateCount: outputCounts.outputRowsByCandidateCount,
      outputRowsByCity: outputCounts.outputRowsByCity,
    },
    provenance: {
      sourceTextSynthetic: false,
      realNeedGroundTruth: false,
      humanReviewed: false,
      trainingEligible: false,
      layaPredictionsUsedAsLabels: false,
      cloudTransferAllowed: false,
      rightsReview: 'required before redistribution; local research use only',
    },
  };
  const finalManifest = `${output}.manifest.json`;
  const finalManifestTemp = `${finalManifest}.tmp`;
  try {
    const fs = await import('node:fs/promises');
    await fs.rename(tempPath, output);
    writeFileSync(finalManifestTemp, `${JSON.stringify(outputManifest, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(finalManifestTemp, finalManifest);
  } catch (error) {
    throw new Error(`Output finalization failed; inspect only the new .tmp artifact. ${String(error)}`);
  }
  console.log(JSON.stringify({
    status: outputManifest.status,
    outputRows,
    outputRowsBySplit: outputCounts.outputRowsBySplit,
    outputRowsByLabelKind: outputCounts.outputRowsByLabelKind,
    candidateCities: Object.keys(outputCounts.outputRowsByCity).length,
    outputSha256,
    output: path.relative(process.cwd(), output),
    manifest: path.relative(process.cwd(), finalManifest),
  }, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Neighborhood choice corpus build failed.');
    process.exitCode = 1;
  });
}
