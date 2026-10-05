#!/usr/bin/env bun
/**
 * Run the exact /post question factory against a local, redacted Divar offer corpus.
 * Outputs are shadow proposals from seller-side listings, never need ground truth
 * and never eligible for training without independent review and rights clearance.
 *
 * Usage:
 *   bun scripts/datasets/run-divar-si-shadow.ts --input <offer-facts.jsonl> --output <shadow.jsonl> --diverse
 *   bun scripts/datasets/run-divar-si-shadow.ts --input <offer-facts.jsonl> --output <shadow.jsonl> --all
 *   bun scripts/datasets/run-divar-si-shadow.ts --input <offer-facts.jsonl> --output <shadow.jsonl> --limit 64
 *   ... --resume
 */
import {
  appendFileSync,
  closeSync,
  createReadStream,
  existsSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { buildPostDecisionQuestions } from '@/lib/need-intake/si/post-decision-questions';
import {
  extractPostNaturalFields,
  hasPostDecisionTextEvidence,
} from '@/lib/need-intake/si/post-natural-extractor';
import {
  buildDivarHypotheticalNeed,
  buildSiDerivedHypotheticalNeed,
  DIVAR_HYPOTHETICAL_NEED_TASK,
} from './divar-hypothetical-need';
import {
  buildDivarSiBatchQuestions,
  buildDivarOfferInspectionQuestions,
  buildDivarSiQuestionsForCandidates,
} from './divar-si-question-factory';

const APPROVED_MODEL = 'convaiinnovations/si-multilingual';
const INPUT_TASK = 'divar-property-offer-facts/v2';
const OUTPUT_TASK = 'divar-property-offer-si-shadow/v2';
const HYPOTHETICAL_OUTPUT_TASK = 'divar-counterfactual-post-need-si-proposal/v5';
const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const SOURCE_SHA256 = 'e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f';
// Version 15 adds a separate Si-derived proposal. It must not resume or
// append rows produced under the previous output contract.
const SCRIPT_VERSION = 15;
const MAX_TEXT_CHARS = 8_000;
const MAX_BATCH = 32;
const DEFAULT_BATCH = 8;
const CONTACT_RE = /(?:https?:\/\/|www\.)|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\d)(?:\+?98|0098)?\s*0?9(?:[\s().-]*\d){9}(?!\d)/iu;

type Json = Record<string, any>;
type OfferRow = {
  exampleId: string;
  taskType: string;
  state: string;
  source: {
    dataset: string;
    datasetSha256: string;
    rowOrdinal: number;
    normalizedTextGroupSha256: string;
    sourceType: string;
  };
  typedDecisions: Json;
  sourceOfferAttributes?: Json;
  offerLocation: Json;
};

type Analysis = {
  row: OfferRow;
  /** Original, privacy-screened Divar offer text sent only to the local Si worker. */
  sourceText: string;
  sourceTextTruncated: boolean;
  sourceTextSha256: string;
  proposalText: string;
  proposalTextTruncated: boolean;
  proposalQuestionSchemaSha256?: string;
  hypotheticalNeed?: NonNullable<ReturnType<typeof buildDivarHypotheticalNeed>>;
  sourceDeterministic: ReturnType<typeof extractPostNaturalFields>;
  deterministic: ReturnType<typeof extractPostNaturalFields>;
  questions: Json;
  questionKey: string;
};

type Manifest = {
  schemaVersion: 1;
  scriptVersion: number;
  taskType: string;
  status: 'running' | 'complete' | 'failed' | 'interrupted';
  sourceDataset: string;
  sourceDatasetSha256: string;
  sourceCorpusPath: string;
  sourceCorpusSha256: string;
  sourceCorpusRows: number;
  model: string;
  devicesUsed: string[];
  siBaseUrl: string;
  batchSize: number;
  selection: string;
  selectionLimit: number | null;
  questionFactoryBaseSha256: string;
  questionFactory: Json;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  interruptedAt?: string;
  outputBytes: number;
  rowsProcessed: number;
  lastSourceRowOrdinal: number;
  inferenceCalls: number;
  totalInferenceMs: number;
  skippedContactPatternRows: number;
  skippedInvalidProposalRows: number;
  truncatedStateRows: number;
  duplicateTextGroupsSkipped: number;
  unsupportedPredictionsSuppressed: Record<string, number>;
  siDerivedProposalStatuses: Record<string, number>;
  categoryCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  questionCounts: Record<string, {
    type: string;
    decisions: number;
    unknown: number;
    predictedValues: Record<string, number>;
  }>;
  disclaimer: string;
  errorCode?: string;
};

type Cli = {
  input: string;
  output: string;
  mode: 'all' | 'limit' | 'diverse' | 'neighborhood-diverse';
  limit: number | null;
  batchSize: number;
  resume: boolean;
  hypotheticalNeeds: boolean;
  baseUrl: string;
};

function parseArgs(argv: string[]): Cli {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (
      arg === '--all' || arg === '--diverse' || arg === '--neighborhood-diverse' ||
      arg === '--resume' || arg === '--help' || arg === '--hypothetical-needs'
    ) flags.add(arg);
    else if (arg.startsWith('--')) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      values.set(arg, value);
      i += 1;
    } else throw new Error('Unexpected positional argument.');
  }
  if (flags.has('--help')) {
    console.log('Pass --input <offer-facts.jsonl> --output <new-shadow.jsonl> and exactly one of --all, --diverse, --neighborhood-diverse, or --limit <n>. --neighborhood-diverse adds one sample per exact mapped city/neighborhood pair. Add --hypothetical-needs to build a synthetic request separately while Si reads the original offer text locally. Use --resume only for this exact run.');
    process.exit(0);
  }

  const modeFlags = Number(flags.has('--all')) + Number(flags.has('--diverse')) +
    Number(flags.has('--neighborhood-diverse')) + Number(values.has('--limit'));
  if (modeFlags !== 1) throw new Error('Choose exactly one of --all, --diverse, --neighborhood-diverse, or --limit <n>.');
  const input = values.get('--input');
  const output = values.get('--output');
  if (!input || !output) throw new Error('--input and --output are required.');
  const limit = values.has('--limit') ? Number(values.get('--limit')) : null;
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('--limit must be a positive integer.');
  const batchSize = values.has('--batch-size') ? Number(values.get('--batch-size')) : DEFAULT_BATCH;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH) {
    throw new Error(`--batch-size must be between 1 and ${MAX_BATCH}.`);
  }
  const outputPath = resolve(output);
  if (outputPath === resolve(input)) throw new Error('Input and output paths must be different.');

  return {
    input: resolve(input),
    output: outputPath,
    mode: flags.has('--all')
      ? 'all'
      : flags.has('--diverse')
        ? 'diverse'
        : flags.has('--neighborhood-diverse')
          ? 'neighborhood-diverse'
          : 'limit',
    limit,
    batchSize,
    resume: flags.has('--resume'),
    hypotheticalNeeds: flags.has('--hypothetical-needs'),
    baseUrl: (values.get('--si-url') ?? process.env.SI_POST_BATCH_URL ?? 'http://127.0.0.1:8101').replace(/\/$/u, ''),
  };
}

function sha256File(path: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeJsonLine(line: string, lineNumber: number): OfferRow {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error(`Malformed source JSONL at line ${lineNumber}.`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid source row at line ${lineNumber}.`);
  const row = value as OfferRow;
  if (
    row.taskType !== INPUT_TASK ||
    row.source?.dataset !== SOURCE_DATASET ||
    row.source?.datasetSha256 !== SOURCE_SHA256 ||
    !Number.isSafeInteger(row.source?.rowOrdinal) ||
    typeof row.source?.normalizedTextGroupSha256 !== 'string' ||
    typeof row.state !== 'string' ||
    !row.state.trim()
  ) {
    throw new Error(`Source row contract failed at line ${lineNumber}.`);
  }
  return row;
}

export async function readLines(path: string, visit: (line: string, index: number) => Promise<void | boolean>): Promise<void> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let index = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    index += 1;
    if (await visit(line, index) === false) break;
  }
}

function inputManifestPath(input: string): string {
  return `${input}.manifest.json`;
}

function outputManifestPath(output: string): string {
  return `${output}.manifest.json`;
}

export function canResumeWithBatchSize(previous: number, requested: number): boolean {
  return Number.isSafeInteger(previous) && previous >= 1 && previous <= MAX_BATCH &&
    Number.isSafeInteger(requested) && requested >= 1 && requested <= previous;
}

function writeManifestAtomic(path: string, manifest: Manifest): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'w', mode: 0o600 });
  renameSync(temporary, path);
}

function makeBaseManifest(
  cli: Cli,
  sourceManifest: Json,
  sourceCorpusSha256: string,
  questionFactory: Json,
  questionFactoryBaseSha256: string,
): Manifest {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    scriptVersion: SCRIPT_VERSION,
    taskType: cli.hypotheticalNeeds ? HYPOTHETICAL_OUTPUT_TASK : OUTPUT_TASK,
    status: 'running',
    sourceDataset: SOURCE_DATASET,
    sourceDatasetSha256: SOURCE_SHA256,
    sourceCorpusPath: cli.input,
    sourceCorpusSha256,
    sourceCorpusRows: Number(sourceManifest.outputRows ?? 0),
    model: APPROVED_MODEL,
    devicesUsed: [],
    siBaseUrl: cli.baseUrl,
    batchSize: cli.batchSize,
    selection: cli.mode,
    selectionLimit: cli.limit,
    questionFactoryBaseSha256,
    questionFactory,
    startedAt: now,
    updatedAt: now,
    outputBytes: 0,
    rowsProcessed: 0,
    lastSourceRowOrdinal: 0,
    inferenceCalls: 0,
    totalInferenceMs: 0,
    skippedContactPatternRows: 0,
    skippedInvalidProposalRows: 0,
    truncatedStateRows: 0,
    duplicateTextGroupsSkipped: 0,
    unsupportedPredictionsSuppressed: {},
    siDerivedProposalStatuses: {},
    categoryCounts: {},
    cityCounts: {},
    questionCounts: {},
    disclaimer: cli.hypotheticalNeeds
      ? 'Si reads the original Divar seller/agent offer text locally. The deterministic reference and the separate Si-derived hypothetical proposal are both synthetic; the latter combines only supported typed Si choices with deterministic mapped facts. Si-derived text is never a real need, gold label, or training target. No offer price/rent/credit becomes a seeker budget. Not approved for production fine-tuning or redistribution; rights, privacy, and ODbL downstream-use review remain pending.'
      : 'Local Si shadow output on seller/agent property offers. These rows are derived counterfactual proposals, not observed seeker needs, not gold labels, and not approved for fine-tuning or redistribution. Independent review, privacy/content-rights review, and ODbL downstream-use review are still required.',
  };
}

function loadOrCreateRun(cli: Cli, base: Manifest): Manifest {
  const sidecar = outputManifestPath(cli.output);
  const outputExists = existsSync(cli.output);
  const manifestExists = existsSync(sidecar);
  if (!cli.resume) {
    if (outputExists || manifestExists) throw new Error('Output exists. Use a new path or pass --resume for this exact run.');
    const fd = openSync(cli.output, 'wx', 0o600);
    closeSync(fd);
    writeManifestAtomic(sidecar, base);
    return base;
  }
  if (!outputExists || !manifestExists) throw new Error('--resume requires both the existing output and its manifest.');
  const prior = JSON.parse(readFileSync(sidecar, 'utf8')) as Manifest;
  const comparable = (key: keyof Manifest) => prior[key] === base[key];
  const compatibleRunnerVersion = prior.scriptVersion === base.scriptVersion;
  const invariants: Array<keyof Manifest> = [
    'schemaVersion', 'taskType', 'sourceDatasetSha256', 'sourceCorpusSha256',
    'model', 'siBaseUrl', 'selection', 'selectionLimit', 'questionFactoryBaseSha256',
  ];
  if (!compatibleRunnerVersion || invariants.some((key) => !comparable(key))) {
    throw new Error('Resume metadata does not match this source, model, selection, or question contract.');
  }
  if (!canResumeWithBatchSize(prior.batchSize, base.batchSize)) {
    throw new Error('Resume may keep or reduce batch size, but may not increase it.');
  }
  if (!Number.isSafeInteger(prior.outputBytes) || prior.outputBytes < 0 || !Number.isSafeInteger(prior.lastSourceRowOrdinal)) {
    throw new Error('Resume manifest checkpoint is invalid.');
  }
  const currentBytes = statSync(cli.output).size;
  if (currentBytes < prior.outputBytes) throw new Error('Output is shorter than its committed checkpoint.');
  if (currentBytes > prior.outputBytes) {
    const fd = openSync(cli.output, 'r+');
    try {
      ftruncateSync(fd, prior.outputBytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  if (prior.status === 'complete') throw new Error('This run is already complete.');
  return {
    ...prior,
    scriptVersion: base.scriptVersion,
    batchSize: base.batchSize,
    devicesUsed: Array.isArray(prior.devicesUsed) ? prior.devicesUsed : [],
    unsupportedPredictionsSuppressed: prior.unsupportedPredictionsSuppressed ?? {},
    status: 'running',
    updatedAt: new Date().toISOString(),
    errorCode: undefined,
  };
}

function categorySlug(row: OfferRow): string {
  return String(row.typedDecisions?.offer_category?.value ?? 'unknown');
}

export function prepareDivarOfferAnalysis(row: OfferRow, hypotheticalNeeds: boolean): Analysis | null {
  const hypotheticalNeed = hypotheticalNeeds ? buildDivarHypotheticalNeed(row) : null;
  if (hypotheticalNeeds && !hypotheticalNeed) return null;
  const fullSourceText = row.state;
  const fullProposalText = hypotheticalNeed?.state ?? row.state;
  const sourceText = fullSourceText.slice(0, MAX_TEXT_CHARS).trim();
  const proposalText = fullProposalText.slice(0, MAX_TEXT_CHARS).trim();
  if (!sourceText || !proposalText || CONTACT_RE.test(sourceText)) return null;
  const sourceDeterministic = extractPostNaturalFields(sourceText);
  const deterministic = hypotheticalNeed
    ? extractPostNaturalFields(proposalText)
    : sourceDeterministic;
  // In counterfactual mode, Si must inspect the actual offer. The generated
  // request is retained separately for parser evaluation and must never be
  // passed back as the offer's input (which would leak the structured targets).
  const proposalQuestions = hypotheticalNeed ? buildDivarSiBatchQuestions() : undefined;
  const questions = hypotheticalNeed
    ? buildDivarOfferInspectionQuestions()
    : buildDivarSiQuestionsForCandidates(
      sourceDeterministic.categoryCandidates,
      sourceDeterministic.includePropertyFields,
    );
  return {
    row,
    sourceText,
    sourceTextTruncated: fullSourceText.length > MAX_TEXT_CHARS,
    sourceTextSha256: sha256Text(sourceText),
    proposalText,
    proposalTextTruncated: fullProposalText.length > MAX_TEXT_CHARS,
    proposalQuestionSchemaSha256: proposalQuestions
      ? sha256Text(JSON.stringify(proposalQuestions))
      : undefined,
    hypotheticalNeed: hypotheticalNeed ?? undefined,
    sourceDeterministic,
    deterministic,
    questions,
    questionKey: JSON.stringify(questions),
  };
}

async function checkWorker(baseUrl: string): Promise<{ device: string }> {
  const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
  const health = await response.json().catch(() => null) as Json | null;
  if (!response.ok || health?.model_loaded !== true || health?.model_name !== APPROVED_MODEL) {
    throw new Error('Local Si worker is not ready with the approved checkpoint.');
  }
  return { device: String(health.device ?? 'unknown') };
}

async function inferGroup(baseUrl: string, analyses: Analysis[]): Promise<{ results: Json[]; latencyMs: number }> {
  const response = await fetch(`${baseUrl}/predict-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      states: analyses.map((item) => ({
        text: item.sourceText,
        normalized_text: item.sourceDeterministic.normalizedText,
        context: {
          city: item.row.offerLocation?.appCitySlug ?? null,
          city_locked_by_user: false,
          category: null,
          category_locked_by_user: false,
          neighborhood_candidates: [],
        },
      })),
      questions: analyses[0].questions,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`Local Si batch failed with HTTP ${response.status}.`);
  const body = await response.json() as { results?: Json[]; latencyMs?: number; model?: string };
  if (body.model !== APPROVED_MODEL || !Array.isArray(body.results) || body.results.length !== analyses.length) {
    throw new Error('Local Si response contract mismatch.');
  }
  return { results: body.results, latencyMs: Number(body.latencyMs ?? 0) };
}

function noteQuestions(manifest: Manifest, questions: Json, answers: Json): void {
  for (const [key, question] of Object.entries(questions)) {
    const answer = answers[key];
    if (!answer) continue;
    const entry = manifest.questionCounts[key] ??= { type: question.type, decisions: 0, unknown: 0, predictedValues: {} };
    entry.decisions += 1;
    const value = question.type === 'choice' ? String(answer.choice ?? 'unknown') : String(answer.noul ?? 'unknown');
    entry.predictedValues[value] = (entry.predictedValues[value] ?? 0) + 1;
    if (value === 'unknown') entry.unknown += 1;
  }
}

async function processChunk(
  cli: Cli,
  chunk: OfferRow[],
  manifest: Manifest,
  worker: { device: string },
): Promise<void> {
  const prepared: Analysis[] = [];
  for (const row of chunk) {
    const analysis = prepareDivarOfferAnalysis(row, cli.hypotheticalNeeds);
    if (!analysis) {
      if (cli.hypotheticalNeeds && !buildDivarHypotheticalNeed(row)) {
        manifest.skippedInvalidProposalRows += 1;
      } else {
        manifest.skippedContactPatternRows += 1;
      }
      continue;
    }
    if (analysis.sourceTextTruncated) manifest.truncatedStateRows += 1;
    prepared.push(analysis);
  }
  if (!manifest.devicesUsed.includes(worker.device)) manifest.devicesUsed.push(worker.device);
  if (!prepared.length) {
    manifest.lastSourceRowOrdinal = chunk.at(-1)?.source.rowOrdinal ?? manifest.lastSourceRowOrdinal;
    manifest.updatedAt = new Date().toISOString();
    writeManifestAtomic(outputManifestPath(cli.output), manifest);
    return;
  }

  const byQuestionSet = new Map<string, Analysis[]>();
  const resultByExampleId = new Map<string, { answers: Json; batchLatencyMs: number; batchSize: number }>();
  for (const item of prepared) {
    const list = byQuestionSet.get(item.questionKey) ?? [];
    list.push(item);
    byQuestionSet.set(item.questionKey, list);
  }
  for (const group of byQuestionSet.values()) {
    const inference = await inferGroup(cli.baseUrl, group);
    manifest.inferenceCalls += 1;
    manifest.totalInferenceMs += inference.latencyMs;
    for (let index = 0; index < group.length; index += 1) {
      const result = inference.results[index];
      resultByExampleId.set(group[index].row.exampleId, {
        answers: result.answers ?? {},
        batchLatencyMs: inference.latencyMs,
        batchSize: group.length,
      });
    }
  }

  const lines: string[] = [];
  for (const item of prepared) {
    const result = resultByExampleId.get(item.row.exampleId);
    if (!result) throw new Error('A source row did not receive a Si result.');
    const supportedAnswers = Object.fromEntries(
      Object.entries(result.answers).filter(([key]) => {
        if (hasPostDecisionTextEvidence(key, item.sourceText)) return true;
        manifest.unsupportedPredictionsSuppressed[key] =
          (manifest.unsupportedPredictionsSuppressed[key] ?? 0) + 1;
        return false;
      }),
    ) as Json;
    const siDerivedHypotheticalNeed = item.hypotheticalNeed
      ? buildSiDerivedHypotheticalNeed(item.row, item.hypotheticalNeed, supportedAnswers)
      : undefined;
    if (siDerivedHypotheticalNeed) {
      const status = siDerivedHypotheticalNeed.conversionStatus;
      manifest.siDerivedProposalStatuses[status] =
        (manifest.siDerivedProposalStatuses[status] ?? 0) + 1;
    }
    noteQuestions(manifest, item.questions, supportedAnswers);
    const category = categorySlug(item.row);
    const city = String(item.row.offerLocation?.appCitySlug ?? 'unmapped');
    manifest.categoryCounts[category] = (manifest.categoryCounts[category] ?? 0) + 1;
    manifest.cityCounts[city] = (manifest.cityCounts[city] ?? 0) + 1;
    lines.push(JSON.stringify({
      schemaVersion: item.hypotheticalNeed ? 5 : 2,
      taskType: item.hypotheticalNeed ? HYPOTHETICAL_OUTPUT_TASK : OUTPUT_TASK,
      exampleId: item.hypotheticalNeed?.exampleId ?? item.row.exampleId,
      synthetic: true,
      derivedFromSupplyListing: true,
      isNeedGroundTruth: false,
      realNeedGroundTruth: false,
      trainingEligible: false,
      shadowOnly: true,
      source: {
        dataset: item.row.source.dataset,
        datasetSha256: item.row.source.datasetSha256,
        sourceType: item.row.source.sourceType,
        sourceRowOrdinal: item.row.source.rowOrdinal,
        sourceExampleId: item.row.exampleId,
        normalizedTextGroupSha256: item.row.source.normalizedTextGroupSha256,
        splitGroup: item.row.source.normalizedTextGroupSha256,
      },
      // `state` remains the generated hypothetical request for the parser and
      // candidate-corpus evaluators; Si input is recorded as a digest only.
      state: item.proposalText,
      stateTruncated: item.proposalTextTruncated,
      ...(item.hypotheticalNeed ? {
        hypotheticalNeed: {
          taskType: DIVAR_HYPOTHETICAL_NEED_TASK,
          schemaVersion: item.hypotheticalNeed.schemaVersion,
          exampleId: item.hypotheticalNeed.exampleId,
          realNeedGroundTruth: false,
          trainingEligible: false,
          generation: item.hypotheticalNeed.generation,
          targetDecisions: item.hypotheticalNeed.targetDecisions,
          questionSchemaSha256: item.proposalQuestionSchemaSha256,
          sourceOfferLocation: item.hypotheticalNeed.sourceOfferLocation,
          sourceOfferConflicts: item.hypotheticalNeed.sourceOfferConflicts,
          originalSplit: item.hypotheticalNeed.originalSplit,
          sourceOfferGroup: item.hypotheticalNeed.sourceOfferGroup,
          excludedOfferFields: item.hypotheticalNeed.excludedOfferFields,
        },
        // This proposal is deliberately separate from the source-derived
        // deterministic reference and is never consumed as a training label.
        siDerivedHypotheticalNeed,
      } : {}),
      deterministic: {
        fields: item.deterministic.fields,
        entities: item.deterministic.entities,
        answers: item.deterministic.answers,
        categoryCandidates: item.deterministic.categoryCandidates,
        cityCandidate: item.deterministic.cityCandidate ?? null,
        neighborhoodPhrase: item.deterministic.neighborhoodPhrase ?? null,
        gaps: item.deterministic.gaps,
        warnings: item.deterministic.warnings,
      },
      si: {
        model: APPROVED_MODEL,
        device: worker.device,
        inputStateKind: 'original_divar_offer_text',
        inputStateSha256: item.sourceTextSha256,
        inputStateTruncated: item.sourceTextTruncated,
        questionSchemaSha256: sha256Text(JSON.stringify(item.questions)),
        answers: supportedAnswers,
        batchLatencyMs: result.batchLatencyMs,
        batchSize: result.batchSize,
        source: 'unreviewed_offer_extraction_proposal_not_gold',
      },
      sourceOfferFacts: item.row.typedDecisions,
      sourceOfferLocation: item.row.offerLocation,
      review: { status: 'pending', trainingUse: 'not_approved' },
      rights: {
        licenseId: 'ODbL-1.0',
        individualContentRightsReview: 'pending',
        privacyReview: 'regex_only_not_comprehensive',
        redistributionAllowed: false,
      },
    }));
  }
  const data = `${lines.join('\n')}\n`;
  const fd = openSync(cli.output, 'a');
  try {
    appendFileSync(fd, data, 'utf8');
    fsyncSync(fd);
    manifest.outputBytes = fstatSync(fd).size;
  } finally {
    closeSync(fd);
  }
  manifest.rowsProcessed += prepared.length;
  manifest.lastSourceRowOrdinal = chunk.at(-1)?.source.rowOrdinal ?? manifest.lastSourceRowOrdinal;
  manifest.updatedAt = new Date().toISOString();
  writeManifestAtomic(outputManifestPath(cli.output), manifest);
}

function chooseDiverse(
  maxByCategory: Map<string, OfferRow>,
  maxByCity: Map<string, OfferRow>,
  maxByNeighborhood: Map<string, OfferRow> = new Map(),
): OfferRow[] {
  const selected = new Map<string, OfferRow>();
  for (const row of [...maxByCategory.values(), ...maxByCity.values(), ...maxByNeighborhood.values()]) {
    selected.set(row.exampleId, row);
  }
  return [...selected.values()].sort((a, b) => a.source.rowOrdinal - b.source.rowOrdinal);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (!existsSync(cli.input)) throw new Error('Input corpus does not exist.');
  const sourceManifestPath = inputManifestPath(cli.input);
  if (!existsSync(sourceManifestPath)) throw new Error('Input corpus manifest is missing.');
  const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8')) as Json;
  if (
    sourceManifest.targetTask !== INPUT_TASK ||
    sourceManifest.dataset !== SOURCE_DATASET ||
    sourceManifest.datasetSha256 !== SOURCE_SHA256 ||
    sourceManifest.cloudTransferAllowed !== false ||
    (cli.hypotheticalNeeds && sourceManifest.sourceOfferAttributesVersion !== 1)
  ) {
    throw new Error('Input corpus manifest does not match the pinned, local-only Divar offer task.');
  }
  const inputHash = await sha256File(cli.input);
  const batchQuestions = cli.hypotheticalNeeds
    ? buildDivarOfferInspectionQuestions()
    : buildPostDecisionQuestions({ includePropertyFields: true });
  const hypotheticalNeedQuestions = cli.hypotheticalNeeds
    ? buildDivarSiBatchQuestions()
    : null;
  const questionContract = {
    questionFactoryVersion: cli.hypotheticalNeeds ? 3 : 2,
    questions: batchQuestions,
    hypotheticalNeedQuestions,
    hypotheticalNeedQuestionSchemaSha256: hypotheticalNeedQuestions
      ? sha256Text(JSON.stringify(hypotheticalNeedQuestions))
      : null,
    categoryCandidatePolicy: cli.hypotheticalNeeds
      ? 'fixed canonical real-estate leaves plus unknown; model input is original seller offer text; predictions are offer-extraction proposals only'
      : 'production_rules_candidates_only; include_si_choice_only_when_two_or_more_terminal_property_candidates; no_unrestricted_category_fallback',
    inferenceInput: 'original_divar_offer_text',
    hypotheticalNeeds: cli.hypotheticalNeeds,
    hypotheticalTask: cli.hypotheticalNeeds ? DIVAR_HYPOTHETICAL_NEED_TASK : null,
    hypotheticalTemplateVersion: cli.hypotheticalNeeds ? 5 : null,
    siDerivedProposalVersion: cli.hypotheticalNeeds ? 1 : null,
    sourceOfferAttributesVersion: cli.hypotheticalNeeds ? 1 : null,
    outputSemanticsVersion: cli.hypotheticalNeeds ? 5 : 2,
  };
  const baseQuestionHash = sha256Text(JSON.stringify(questionContract));
  const baseManifest = makeBaseManifest(cli, sourceManifest, inputHash, questionContract, baseQuestionHash);
  const worker = await checkWorker(cli.baseUrl);
  let manifest = loadOrCreateRun(cli, baseManifest);
  process.once('SIGINT', () => {
    manifest.status = 'interrupted';
    manifest.interruptedAt = new Date().toISOString();
    manifest.updatedAt = manifest.interruptedAt;
    manifest.errorCode = 'operator_interrupted_at_committed_checkpoint';
    writeManifestAtomic(outputManifestPath(cli.output), manifest);
    process.exit(130);
  });
  console.log(`model=${APPROVED_MODEL} device=${worker.device} selection=${cli.mode} batch_size=${cli.batchSize}`);

  try {
    let seenGroups = new Set<string>();
    let pending: OfferRow[] = [];
    let selectedCount = 0;
    let sourceLines = 0;
    const maxByCategory = new Map<string, OfferRow>();
    const maxByCity = new Map<string, OfferRow>();
    const maxByNeighborhood = new Map<string, OfferRow>();
    const priority = (row: OfferRow) => sha256Text(row.source.normalizedTextGroupSha256);
    const isDiverseSelection = cli.mode === 'diverse' || cli.mode === 'neighborhood-diverse';

    const flush = async () => {
      if (!pending.length) return;
      await processChunk(cli, pending, manifest, worker);
      pending = [];
      console.log(`processed=${manifest.rowsProcessed} last_source_row=${manifest.lastSourceRowOrdinal} inference_calls=${manifest.inferenceCalls}`);
    };

    await readLines(cli.input, async (line, lineNumber) => {
      sourceLines = lineNumber;
      if (cli.mode === 'limit' && manifest.rowsProcessed + pending.length >= (cli.limit ?? 0)) return false;
      const row = safeJsonLine(line, lineNumber);
      const group = row.source.normalizedTextGroupSha256;
      if (seenGroups.has(group)) {
        if (isDiverseSelection) {
          if (manifest.rowsProcessed === 0) manifest.duplicateTextGroupsSkipped += 1;
        } else if (row.source.rowOrdinal > manifest.lastSourceRowOrdinal) {
          manifest.duplicateTextGroupsSkipped += 1;
        }
        return;
      }
      seenGroups.add(group);

      if (isDiverseSelection) {
        if (CONTACT_RE.test(row.state.slice(0, MAX_TEXT_CHARS))) {
          if (manifest.rowsProcessed === 0) manifest.skippedContactPatternRows += 1;
          return;
        }
        const cat = categorySlug(row);
        const city = String(row.offerLocation?.appCitySlug ?? '');
        const currentCategory = maxByCategory.get(cat);
        if (!currentCategory || priority(row) < priority(currentCategory)) maxByCategory.set(cat, row);
        if (city) {
          const currentCity = maxByCity.get(city);
          if (!currentCity || priority(row) < priority(currentCity)) maxByCity.set(city, row);
        }
        const neighborhoodId = row.offerLocation?.neighborhoodMatch === 'exact_official_crosswalk'
          ? String(row.offerLocation?.appNeighborhoodId ?? '')
          : '';
        if (cli.mode === 'neighborhood-diverse' && city && neighborhoodId) {
          const pair = `${city}\u0000${neighborhoodId}`;
          const currentPair = maxByNeighborhood.get(pair);
          if (!currentPair || priority(row) < priority(currentPair)) maxByNeighborhood.set(pair, row);
        }
        return;
      }

      if (row.source.rowOrdinal <= manifest.lastSourceRowOrdinal) return;
      if (CONTACT_RE.test(row.state.slice(0, MAX_TEXT_CHARS))) {
        if (row.source.rowOrdinal > manifest.lastSourceRowOrdinal) {
          manifest.skippedContactPatternRows += 1;
        }
        manifest.lastSourceRowOrdinal = row.source.rowOrdinal;
        return;
      }
      pending.push(row);
      selectedCount += 1;
      if (pending.length >= cli.batchSize) await flush();
    });

    if (isDiverseSelection) {
      const allChosen = chooseDiverse(
        maxByCategory,
        maxByCity,
        cli.mode === 'neighborhood-diverse' ? maxByNeighborhood : undefined,
      );
      const alreadyProcessed = manifest.rowsProcessed;
      const completedBeforeCursor = allChosen.filter((row) => row.source.rowOrdinal <= manifest.lastSourceRowOrdinal).length;
      if (alreadyProcessed > allChosen.length || completedBeforeCursor !== alreadyProcessed) {
        throw new Error('Diverse resume cursor is inconsistent with its output.');
      }
      const remaining = allChosen.filter((row) => row.source.rowOrdinal > manifest.lastSourceRowOrdinal);
      selectedCount = allChosen.length;
      for (let offset = 0; offset < remaining.length; offset += cli.batchSize) {
        const chunk = remaining.slice(offset, offset + cli.batchSize);
        await processChunk(cli, chunk, manifest, worker);
        console.log(`processed=${manifest.rowsProcessed} last_source_row=${manifest.lastSourceRowOrdinal} inference_calls=${manifest.inferenceCalls}`);
      }
    } else {
      await flush();
    }

    manifest.status = 'complete';
    manifest.completedAt = new Date().toISOString();
    manifest.updatedAt = manifest.completedAt;
    manifest.outputBytes = statSync(cli.output).size;
    writeManifestAtomic(outputManifestPath(cli.output), manifest);
    console.log(JSON.stringify({
      status: manifest.status,
      selected: selectedCount,
      outputRows: manifest.rowsProcessed,
      sourceLines,
      skippedContactPatternRows: manifest.skippedContactPatternRows,
      skippedInvalidProposalRows: manifest.skippedInvalidProposalRows,
      duplicateTextGroupsSkipped: manifest.duplicateTextGroupsSkipped,
      siAverageBatchMs: manifest.inferenceCalls ? Math.round(manifest.totalInferenceMs / manifest.inferenceCalls) : 0,
      outputBytes: manifest.outputBytes,
      trainingEligible: false,
    }, null, 2));
  } catch (error) {
    manifest.status = 'failed';
    manifest.updatedAt = new Date().toISOString();
    manifest.outputBytes = existsSync(cli.output) ? statSync(cli.output).size : manifest.outputBytes;
    manifest.errorCode = error instanceof Error && error.message.startsWith('Local Si')
      ? 'si_shadow_request_failed'
      : 'shadow_pipeline_failed';
    writeManifestAtomic(outputManifestPath(cli.output), manifest);
    throw error;
  }
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'unknown failure';
    console.error(message);
    process.exitCode = 1;
  });
}
