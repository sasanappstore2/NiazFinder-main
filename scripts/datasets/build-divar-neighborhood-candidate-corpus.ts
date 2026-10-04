#!/usr/bin/env bun
/**
 * Build a local-only, weakly supervised Laya neighborhood-choice shadow corpus.
 *
 * The source is seller/agent supply text, not seeker demand. A row is eligible
 * only when the existing city-scoped resolver finds multiple explicit catalog
 * candidates and the exact official Divar crosswalk target is among them.
 * This prepares a later research stage; it is not production training data.
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

const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const SOURCE_SHA256 = 'e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f';
const SOURCE_FACTS =
  'data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl';
const SOURCE_MANIFEST = `${SOURCE_FACTS}.manifest.json`;
const DEFAULT_OUTPUT =
  'data/divar/divar-neighborhood-candidate-shadow-v1-exact-city-2026-09-28-r3.jsonl';
const MAX_CANDIDATES = 8;
const TASK_TYPE = 'divar-neighborhood-candidate-shadow/v1';

type JsonObject = Record<string, unknown>;

type FactRow = {
  exampleId?: string;
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

export type NeighborhoodCandidateDecision = {
  candidateIds: string[];
  question: {
    type: 'choice';
    instructions: string;
    criteria: Record<string, string>;
  };
};

export type NeighborhoodCandidateInspection =
  | { status: 'eligible'; decision: NeighborhoodCandidateDecision }
  | {
      status:
        | 'between_places'
        | 'unique_rule_match'
        | 'no_explicit_candidate'
        | 'candidate_overflow'
        | 'target_not_candidate';
    };

type GroupFacts = { targets: Set<string>; splits: Set<string> };

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
        'Usage: bun scripts/datasets/build-divar-neighborhood-candidate-corpus.ts [--input facts.jsonl] [--manifest facts.jsonl.manifest.json] [--output new-shadow.jsonl]'
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
    typeof row.state === 'string' &&
    row.state.trim().length > 0 &&
    row.split !== undefined &&
    ['train', 'calibration', 'test'].includes(row.split) &&
    typeof row.offerLocation?.appCitySlug === 'string' &&
    typeof row.offerLocation.appNeighborhoodId === 'string' &&
    row.offerLocation.neighborhoodMatch === 'exact_official_crosswalk'
  );
}

function textDescribesBetweenPlaces(text: string): boolean {
  // A single-neighborhood class cannot faithfully represent a boundary between
  // two named places. Keep those rows out instead of choosing one side.
  return /(?:^|\s)(?:بین|میان)\s+.{1,60}?\s+(?:و|تا)\s+.{1,60}(?:$|[،,.\s])/u.test(text);
}

function compactLocationKey(value: string): string {
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

function targetLabelAppearsInText(target: ManagedNeighborhood | undefined, text: string): boolean {
  if (!target) return false;
  const normalizedText = compactLocationKey(text);
  const labels = [
    target.name,
    target.name.replace(/^(?:شهید|سید|آیت\s+الله)\s+/u, ''),
    ...(target.areas ?? []),
  ];
  return labels.some((label) => {
    const key = compactLocationKey(label);
    return key.length >= 3 && normalizedText.includes(key);
  });
}

function describeCandidate(neighborhood: ManagedNeighborhood): string {
  const aliases = [...new Set((neighborhood.areas ?? []).map((value) => value.trim()).filter(Boolean))]
    .slice(0, 3)
    .map((value) => value.slice(0, 48));
  const suffix = aliases.length ? `؛ نام‌های محدوده: ${aliases.join('، ')}` : '';
  return `محلهٔ ${neighborhood.name}${suffix}`;
}

/** Pure candidate-label gate, exported so fixtures can test abstention and boundaries. */
export function inspectNeighborhoodCandidateDecision(
  neighborhoods: ManagedNeighborhood[],
  text: string,
  cityName: string,
  targetNeighborhoodId: string,
  targetNeighborhood?: ManagedNeighborhood,
): NeighborhoodCandidateInspection {
  if (textDescribesBetweenPlaces(text)) return { status: 'between_places' };
  if (!text.trim() || !cityName.trim() || !neighborhoods.length) {
    return { status: 'no_explicit_candidate' };
  }
  // Most geotagged offer texts do not name their mapped neighborhood. Skip
  // expensive full-catalog matching unless that neighborhood or a catalog
  // sub-area alias is literally present; the resolver still verifies cue,
  // city-span, ambiguity, and token-boundary rules before any row is emitted.
  if (!targetLabelAppearsInText(
    targetNeighborhood ?? neighborhoods.find((item) => item.id === targetNeighborhoodId),
    text,
  )) {
    return { status: 'no_explicit_candidate' };
  }

  const result = resolveTextNeighborhoodInCity(neighborhoods, text, cityName);
  // Unique explicit matches belong to deterministic resolution, not a model.
  if (result.hit) return { status: 'unique_rule_match' };
  if (result.candidates.length < 2) return { status: 'no_explicit_candidate' };
  if (result.candidates.length > MAX_CANDIDATES) {
    return { status: 'candidate_overflow' };
  }

  const unique = [...new Map(result.candidates.map((item) => [item.id, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id, 'fa'));
  if (unique.length < 2) return { status: 'no_explicit_candidate' };
  if (unique.length > MAX_CANDIDATES) return { status: 'candidate_overflow' };
  if (!unique.some((item) => item.id === targetNeighborhoodId)) return { status: 'target_not_candidate' };

  const criteria = Object.fromEntries(
    unique.map((item) => [item.id, describeCandidate(item)]),
  );
  criteria.unknown = 'نام یا مقصود مکانی از متن روشن نیست؛ هیچ محله‌ای را حدس نزن.';

  return {
    status: 'eligible',
    decision: {
      candidateIds: unique.map((item) => item.id),
      question: {
        type: 'choice',
        instructions:
          `از متن آگهی و شهرِ زمینه (${cityName}) فقط بین گزینه‌های فهرست‌شده انتخاب کن. اگر اشاره به محله روشن نیست، unknown؛ اگر متن دو سوی محدوده را می‌گوید، یک محله را به‌جای آن انتخاب نکن.`,
        criteria,
      },
    },
  };
}

export function buildNeighborhoodCandidateDecision(
  neighborhoods: ManagedNeighborhood[],
  text: string,
  cityName: string,
  targetNeighborhoodId: string,
): NeighborhoodCandidateDecision | null {
  const inspection = inspectNeighborhoodCandidateDecision(
    neighborhoods,
    text,
    cityName,
    targetNeighborhoodId,
  );
  return inspection.status === 'eligible' ? inspection.decision : null;
}

async function* readJsonl(filePath: string): AsyncGenerator<FactRow> {
  const lines = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSONL at line ${lineNumber}.`);
    }
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Expected a JSON object at line ${lineNumber}.`);
    }
    yield row as FactRow;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) digest.update(chunk as Buffer);
  return digest.digest('hex');
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

async function managedCatalog(citySlug: string): Promise<{
  cityName: string;
  rows: ManagedNeighborhood[];
  byId: Map<string, ManagedNeighborhood>;
}> {
  const rows = await loadCityNeighborhoods(citySlug);
  let cityName = citySlug;
  for (const catalogCityId of resolveCatalogCityIdCandidates(citySlug)) {
    const catalog = await loadCityCatalogFile(catalogCityId);
    if (catalog?.cityName?.trim()) {
      cityName = catalog.cityName.trim();
      break;
    }
  }
  return {
    cityName,
    rows,
    byId: new Map(rows.map((item) => [item.id, item])),
  };
}

async function writeLine(writer: NodeJS.WritableStream, value: unknown): Promise<void> {
  if (!writer.write(`${JSON.stringify(value)}\n`)) await once(writer, 'drain');
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.input) || !existsSync(args.manifest)) {
    throw new Error('Pinned facts input or source manifest is missing.');
  }
  if (existsSync(args.output) || existsSync(`${args.output}.manifest.json`)) {
    throw new Error('Refusing to overwrite an existing candidate corpus artifact.');
  }
  const sourceManifest = readAndValidateSourceManifest(args.manifest);
  const inputSha256 = await sha256File(args.input);
  const sourceManifestSha256 = await sha256File(args.manifest);

  const groups = new Map<string, GroupFacts>();
  let sourceRowsRead = 0;
  let exactMappedRows = 0;
  for await (const row of readJsonl(args.input)) {
    sourceRowsRead += 1;
    if (!isExactMappedRow(row)) continue;
    exactMappedRows += 1;
    const group = row.source!.normalizedTextGroupSha256!;
    const location = `${row.offerLocation!.appCitySlug}\u0000${row.offerLocation!.appNeighborhoodId}`;
    const current = groups.get(group) ?? { targets: new Set<string>(), splits: new Set<string>() };
    current.targets.add(location);
    current.splits.add(row.split!);
    groups.set(group, current);
  }
  if (sourceRowsRead !== sourceManifest.outputRows) {
    throw new Error(`Source row-count mismatch: read ${sourceRowsRead}, expected ${sourceManifest.outputRows}.`);
  }

  const conflictingGroups = new Set(
    [...groups].filter(([, value]) => value.targets.size !== 1 || value.splits.size !== 1).map(([key]) => key),
  );
  const seenGroups = new Set<string>();
  const catalogs = new Map<string, ReturnType<typeof managedCatalog>>();
  const splitCounts = { train: 0, calibration: 0, test: 0 };
  const candidateCountCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const excluded = {
    nonExactOrUnmapped: sourceRowsRead - exactMappedRows,
    conflictingOrCrossSplitTextGroups: 0,
    duplicateTextGroups: 0,
    missingCatalog: 0,
    noExplicitAmbiguity: 0,
    uniqueDeterministicMatches: 0,
    betweenPlaces: 0,
    candidateOverflow: 0,
    targetNotAmongCandidates: 0,
  };
  const tempPath = `${args.output}.tmp`;
  const writer = createWriteStream(tempPath, { flags: 'wx' });
  const outputHash = createHash('sha256');
  let outputBytes = 0;
  let outputRows = 0;

  try {
    for await (const row of readJsonl(args.input)) {
      if (!isExactMappedRow(row)) continue;
      const source = row.source!;
      const group = source.normalizedTextGroupSha256!;
      if (conflictingGroups.has(group)) {
        excluded.conflictingOrCrossSplitTextGroups += 1;
        continue;
      }
      if (seenGroups.has(group)) {
        excluded.duplicateTextGroups += 1;
        continue;
      }
      seenGroups.add(group);

      const citySlug = row.offerLocation!.appCitySlug!;
      let catalog = catalogs.get(citySlug);
      if (!catalog) {
        catalog = await managedCatalog(citySlug);
        catalogs.set(citySlug, catalog);
      }
      if (!catalog.rows.length) {
        excluded.missingCatalog += 1;
        continue;
      }

      const inspection = inspectNeighborhoodCandidateDecision(
        catalog.rows,
        row.state!,
        catalog.cityName,
        row.offerLocation!.appNeighborhoodId!,
        catalog.byId.get(row.offerLocation!.appNeighborhoodId!),
      );
      if (inspection.status !== 'eligible') {
        if (inspection.status === 'between_places') excluded.betweenPlaces += 1;
        else if (inspection.status === 'unique_rule_match') excluded.uniqueDeterministicMatches += 1;
        else if (inspection.status === 'candidate_overflow') excluded.candidateOverflow += 1;
        else if (inspection.status === 'target_not_candidate') excluded.targetNotAmongCandidates += 1;
        else excluded.noExplicitAmbiguity += 1;
        continue;
      }
      const decision = inspection.decision;

      const outputRow = {
        schemaVersion: 1,
        taskType: TASK_TYPE,
        exampleId: sha256(`${group}:${citySlug}:${row.offerLocation!.appNeighborhoodId}`),
        state: {
          text: row.state,
          context: {
            city: citySlug,
            neighborhood_candidates: decision.candidateIds.map((id) => ({
              slug: id,
              name: catalog!.byId.get(id)?.name ?? id,
            })),
          },
        },
        questions: { neighborhood_candidate: decision.question },
        targetDecisions: {
          neighborhood_candidate: {
            value: row.offerLocation!.appNeighborhoodId,
            source: 'weak_exact_crosswalk_plus_city_scoped_explicit_text_candidates',
          },
        },
        source: {
          dataset: SOURCE_DATASET,
          datasetSha256: SOURCE_SHA256,
          rowOrdinal: source.rowOrdinal,
          normalizedTextGroupSha256: group,
          split: row.split,
          perspective: 'seller_or_agent_supply_offer',
          offerNeighborhoodMatch: 'exact_official_crosswalk',
        },
        provenance: {
          derived: true,
          synthetic: false,
          realNeedGroundTruth: false,
          humanReviewed: false,
          trainingEligible: false,
          cloudTransferAllowed: false,
        },
      };
      const line = `${JSON.stringify(outputRow)}\n`;
      outputHash.update(line);
      outputBytes += Buffer.byteLength(line);
      await writeLine(writer, outputRow);
      outputRows += 1;
      splitCounts[row.split! as keyof typeof splitCounts] += 1;
      const candidateCount = String(decision.candidateIds.length);
      candidateCountCounts[candidateCount] = (candidateCountCounts[candidateCount] ?? 0) + 1;
      cityCounts[citySlug] = (cityCounts[citySlug] ?? 0) + 1;
    }
    writer.end();
    await once(writer, 'finish');
  } catch (error) {
    writer.destroy();
    throw error;
  }

  const outputSha256 = outputHash.digest('hex');
  const manifest = {
    schemaVersion: 1,
    taskType: TASK_TYPE,
    status: 'complete_shadow_only',
    createdAt: startedAt,
    input: path.relative(process.cwd(), args.input),
    inputManifest: path.relative(process.cwd(), args.manifest),
    inputSha256,
    sourceManifestSha256,
    inputRows: sourceRowsRead,
    outputRows,
    outputBytes,
    outputSha256,
    source: SOURCE_DATASET,
    sourceSha256: SOURCE_SHA256,
    sourcePerspective: 'seller_or_agent_supply_offer_not_seeker_demand',
    labelPolicy: 'exact-official city/neighborhood crosswalk plus explicit text-grounded resolver ambiguity; weak pseudo-label, not human truth',
    resolver: 'resolveTextNeighborhoodInCity from the existing /post city-scoped resolver',
    maxCandidates: MAX_CANDIDATES,
    splitPolicy: 'preserve source normalized-text-group split; conflicting location targets or split assignments excluded; one row per normalized group',
    counts: {
      exactMappedRows,
      uniqueMappedTextGroups: groups.size,
      conflictingOrCrossSplitGroups: conflictingGroups.size,
      outputRowsBySplit: splitCounts,
      outputRowsByCandidateCount: candidateCountCounts,
      outputRowsByCity: cityCounts,
      excluded,
    },
    privacy: {
      sourcePolicy: sourceManifest.privacyPolicy,
      localOnly: true,
      cloudTransferAllowed: false,
      rightsReviewRequiredBeforeRedistribution: true,
    },
    qualityGates: {
      realNeedGroundTruth: false,
      humanReviewed: false,
      trainingEligible: false,
      productionEligible: false,
      requiresHeldOutModelComparisonAgainstDeterministicResolver: true,
    },
  };

  const finalManifestPath = `${args.output}.manifest.json`;
  const finalManifestTemp = `${finalManifestPath}.tmp`;
  try {
    const fs = await import('node:fs/promises');
    await fs.rename(tempPath, args.output);
    writeFileSync(finalManifestTemp, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(finalManifestTemp, finalManifestPath);
  } catch (error) {
    throw new Error(`Output finalization failed; inspect only the new .tmp artifact. ${String(error)}`);
  }

  console.log(JSON.stringify({
    status: manifest.status,
    outputRows,
    outputRowsBySplit: splitCounts,
    outputRowsByCandidateCount: candidateCountCounts,
    candidateCities: Object.keys(cityCounts).length,
    excluded,
    outputSha256,
    output: path.relative(process.cwd(), args.output),
    manifest: path.relative(process.cwd(), finalManifestPath),
  }, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Neighborhood candidate corpus build failed.');
    process.exitCode = 1;
  });
}
