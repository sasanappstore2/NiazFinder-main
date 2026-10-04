#!/usr/bin/env bun
/**
 * Stream Divar's locally normalized real-estate offers into explicitly
 * hypothetical seeker utterances for an isolated Laya-head experiment.
 *
 * Laya predictions are deliberately not used here: targets are derived from
 * audited source facts, and all resulting examples remain synthetic,
 * unreviewed, and ineligible for production or redistribution.
 */
import {
  closeSync,
  createReadStream,
  existsSync,
  fsyncSync,
  openSync,
  readSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { basename, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { buildDivarHypotheticalNeed, DIVAR_HYPOTHETICAL_NEED_TASK } from './divar-hypothetical-need';
import { buildDivarHypotheticalNeedV6, DIVAR_HYPOTHETICAL_NEED_V6_TASK } from './divar-hypothetical-need-v6';
import { buildDivarLayaBatchQuestions } from './divar-laya-question-factory';
import { normalizeLayaCorpusText } from './laya-corpus-audit-shape';

const MODEL = 'convaiinnovations/laya-multilingual';
const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const SOURCE_TASK = 'divar-property-offer-facts/v2';
const OUTPUT_TASKS = {
  5: 'divar-counterfactual-post-need-laya-proposal/v5',
  6: 'divar-counterfactual-post-need-laya-proposal/v6',
} as const;
type SemanticsVersion = keyof typeof OUTPUT_TASKS;
type HypotheticalNeed = NonNullable<ReturnType<typeof buildDivarHypotheticalNeed>>
  | NonNullable<ReturnType<typeof buildDivarHypotheticalNeedV6>>;
const TRAINING_SPLIT_POLICY = 'sha256(normalized_state) first32bits % 100; 0-79=train, 80-89=calibration, 90-99=test';
const TARGET_KEYS = [
  'category_candidate', 'property_kind', 'transaction_type', 'deed_type',
  'usage', 'city', 'neighborhood', 'area', 'rooms', 'parking', 'elevator',
  'storage', 'budget', 'monthly_rent', 'deposit',
] as const;

type Json = Record<string, any>;
type Cli = {
  input: string;
  sourceManifest: string;
  output: string;
  manifest: string;
  workers: number;
  workerStart?: number;
  workerEnd?: number;
  workerPartOutput?: string;
  questionHash?: string;
  semanticsVersion: SemanticsVersion;
};

let interruptRequested = false;
const activeWorkers = new Set<ChildProcess>();
process.once('SIGINT', () => {
  interruptRequested = true;
  for (const worker of activeWorkers) worker.kill('SIGINT');
});

function parseArgs(argv: string[]): Cli {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]!;
    if (key === '--help') {
      console.log('Usage: bun scripts/datasets/build-divar-laya-training-corpus.ts --input <facts.jsonl> --source-manifest <facts.manifest.json> --output <new.jsonl> --manifest <new.manifest.json> [--semantics-version 5|6] [--workers 6]');
      process.exit(0);
    }
    if (!['--input', '--source-manifest', '--output', '--manifest', '--workers', '--semantics-version', '--worker-start-byte', '--worker-end-byte', '--worker-part-output', '--question-hash'].includes(key)) {
      throw new Error('Unsupported argument.');
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    values.set(key, value);
    i += 1;
  }
  const input = values.get('--input');
  const sourceManifest = values.get('--source-manifest');
  const output = values.get('--output');
  const manifest = values.get('--manifest');
  if (!input || !sourceManifest || !output || !manifest) throw new Error('Input, source manifest, output, and manifest are required.');
  const workers = Number(values.get('--workers') ?? '6');
  if (!Number.isInteger(workers) || workers < 1 || workers > 8) throw new Error('--workers must be an integer from 1 to 8.');
  const semanticsVersion = Number(values.get('--semantics-version') ?? '5');
  if (semanticsVersion !== 5 && semanticsVersion !== 6) throw new Error('--semantics-version must be 5 or 6.');
  const workerStart = values.has('--worker-start-byte') ? Number(values.get('--worker-start-byte')) : undefined;
  const workerEnd = values.has('--worker-end-byte') ? Number(values.get('--worker-end-byte')) : undefined;
  if ((workerStart === undefined) !== (workerEnd === undefined) ||
      (workerStart !== undefined && (!Number.isSafeInteger(workerStart) || !Number.isSafeInteger(workerEnd) || workerStart < 0 || workerEnd! < workerStart!))) {
    throw new Error('Internal byte-range arguments are invalid.');
  }
  return {
    input: resolve(input), sourceManifest: resolve(sourceManifest), output: resolve(output),
    manifest: resolve(manifest), workers, workerStart, workerEnd,
    workerPartOutput: values.get('--worker-part-output') ? resolve(values.get('--worker-part-output')!) : undefined,
    questionHash: values.get('--question-hash'),
    semanticsVersion,
  };
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function sha256File(path: string): Promise<string> {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk as Buffer);
  return digest.digest('hex');
}

function baseRow(sourceRow: Json, hypothetical: HypotheticalNeed, questionHash: string): Json {
  return {
    schemaVersion: hypothetical.schemaVersion,
    taskType: OUTPUT_TASKS[hypothetical.schemaVersion],
    exampleId: hypothetical.exampleId,
    synthetic: true,
    derivedFromSupplyListing: true,
    isNeedGroundTruth: false,
    realNeedGroundTruth: false,
    trainingEligible: false,
    shadowOnly: true,
    source: {
      dataset: sourceRow.source.dataset,
      datasetSha256: sourceRow.source.datasetSha256,
      sourceType: sourceRow.source.sourceType,
      sourceRowOrdinal: sourceRow.source.rowOrdinal,
      sourceExampleId: sourceRow.exampleId,
      normalizedTextGroupSha256: sourceRow.source.normalizedTextGroupSha256,
      splitGroup: sourceRow.splitGroup ?? sourceRow.source.normalizedTextGroupSha256,
    },
    state: hypothetical.state,
    stateTruncated: false,
    hypotheticalNeed: {
      taskType: hypothetical.taskType,
      schemaVersion: hypothetical.schemaVersion,
      exampleId: hypothetical.exampleId,
      realNeedGroundTruth: false,
      trainingEligible: false,
      generation: hypothetical.generation,
      targetDecisions: hypothetical.targetDecisions,
      questionSchemaSha256: questionHash,
      sourceOfferLocation: hypothetical.sourceOfferLocation,
      sourceOfferConflicts: hypothetical.sourceOfferConflicts,
      originalSplit: hypothetical.originalSplit,
      sourceOfferGroup: hypothetical.sourceOfferGroup,
      excludedOfferFields: hypothetical.excludedOfferFields,
    },
  };
}

function labelFingerprint(row: Json): string {
  const targets = row.hypotheticalNeed.targetDecisions;
  const values = Object.fromEntries(TARGET_KEYS.map((key) => [key, targets[key]?.value ?? null]));
  return sha256Text(JSON.stringify(values));
}

function sourceGroup(row: Json): string {
  const group = row.source?.splitGroup ?? row.source?.normalizedTextGroupSha256;
  if (typeof group !== 'string' || !/^[a-f0-9]{64}$/u.test(group)) throw new Error('A source row lacks a stable normalized-text group hash.');
  return group;
}

function stateGroup(row: Json): string {
  if (typeof row.state !== 'string' || !normalizeLayaCorpusText(row.state)) {
    throw new Error('A generated row has no normalized model-input text.');
  }
  return sha256Text(normalizeLayaCorpusText(row.state));
}

function trainingSplitForState(state: string): 'train' | 'calibration' | 'test' {
  const normalized = normalizeLayaCorpusText(state);
  if (!normalized) throw new Error('A generated row has no normalized model-input text.');
  const bucket = Number.parseInt(sha256Text(normalized).slice(0, 8), 16) % 100;
  return bucket < 80 ? 'train' : bucket < 90 ? 'calibration' : 'test';
}

export type TrainingStateGroup = {
  fingerprint: string;
  trainingSplit: 'train' | 'calibration' | 'test';
  rows: number;
  conflicting: boolean;
  emitted: boolean;
};

export function observeTrainingStateGroup(index: Map<string, TrainingStateGroup>, row: Json): string {
  const group = stateGroup(row);
  const fingerprint = labelFingerprint(row);
  const trainingSplit = trainingSplitForState(row.state);
  const prior = index.get(group);
  if (!prior) {
    index.set(group, { fingerprint, trainingSplit, rows: 1, conflicting: false, emitted: false });
    return group;
  }
  prior.rows += 1;
  if (prior.fingerprint !== fingerprint) prior.conflicting = true;
  return group;
}

function writeBuffered(fd: number, text: string): string {
  let pending = text;
  while (pending.length >= 1024 * 1024) {
    const chunk = pending.slice(0, 1024 * 1024);
    writeSync(fd, chunk);
    pending = pending.slice(chunk.length);
  }
  return pending;
}

function getByteRanges(path: string, workers: number): Array<{ start: number; end: number }> {
  const size = statSync(path).size;
  if (size < workers) throw new Error('Source corpus is too small for the requested worker count.');
  const fd = openSync(path, 'r');
  const buffer = Buffer.alloc(64 * 1024);
  const starts = [0];
  try {
    for (let worker = 1; worker < workers; worker += 1) {
      const target = Math.floor(size * worker / workers);
      let position = target;
      let found: number | undefined;
      while (position < size && found === undefined) {
        const read = readSyncChunk(fd, buffer, position);
        if (read === 0) break;
        const newline = buffer.subarray(0, read).indexOf(0x0a);
        if (newline >= 0) found = position + newline + 1;
        else position += read;
      }
      if (found !== undefined && found > starts.at(-1)! && found < size) starts.push(found);
    }
  } finally {
    closeSync(fd);
  }
  return starts.map((start, index) => ({ start, end: (starts[index + 1] ?? size) - 1 }));
}

function readSyncChunk(fd: number, buffer: Buffer, position: number): number {
  // Node/Bun's positional read is deterministic across worker-boundary scans.
  return readSync(fd, buffer, 0, buffer.length, position);
}

async function runWorker(cli: Cli, tempOutput: string, questionHash: string): Promise<Json> {
  const fd = openSync(tempOutput, 'wx', 0o600);
  let pending = '';
  let rowsRead = 0;
  let proposals = 0;
  let skipped = 0;
  try {
    const stream = createReadStream(cli.input, {
      start: cli.workerStart,
      end: cli.workerEnd,
      encoding: 'utf8',
    });
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of lines) {
      if (interruptRequested) break;
      if (!line.trim()) continue;
      rowsRead += 1;
      let sourceRow: Json;
      try {
        sourceRow = JSON.parse(line) as Json;
      } catch {
        throw new Error(`Malformed source JSON in worker range near row ${rowsRead}.`);
      }
      if (sourceRow.taskType !== SOURCE_TASK || sourceRow.source?.dataset !== SOURCE_DATASET || sourceRow.synthetic !== false || sourceRow.isNeedGroundTruth !== false) {
        throw new Error('Source row does not satisfy the Divar seller-offer fact contract.');
      }
      const hypothetical = cli.semanticsVersion === 6
        ? buildDivarHypotheticalNeedV6(sourceRow)
        : buildDivarHypotheticalNeed(sourceRow);
      if (!hypothetical) {
        skipped += 1;
        continue;
      }
      const row = baseRow(sourceRow, hypothetical, questionHash);
      pending += `${JSON.stringify(row)}\n`;
      proposals += 1;
      if (rowsRead % 25_000 === 0) {
        console.log(JSON.stringify({ progress: true, rowsRead, proposals, skipped }));
      }
      if (pending.length >= 1024 * 1024) {
        pending = writeBuffered(fd, pending);
      }
    }
    if (pending) writeSync(fd, pending);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return { rowsRead, proposals, skipped, output: tempOutput };
}

function spawnWorker(args: string[], workerNumber: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [import.meta.filename, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    activeWorkers.add(child);
    let stdoutBuffer = '';
    let resultLine = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      while (stdoutBuffer.includes('\n')) {
        const newline = stdoutBuffer.indexOf('\n');
        const line = stdoutBuffer.slice(0, newline);
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as Json;
          if (event.progress === true) {
            console.log(`worker=${workerNumber} source_rows=${event.rowsRead} proposals=${event.proposals} skipped=${event.skipped}`);
          } else {
            resultLine = line;
          }
        } catch {
          stderr += `${line}\n`;
        }
      }
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });
    child.once('error', rejectPromise);
    child.once('close', (code) => {
      activeWorkers.delete(child);
      if (stdoutBuffer.trim()) resultLine = stdoutBuffer.trim();
      resolvePromise({ code: code ?? 1, stdout: resultLine, stderr });
    });
  });
}

async function runParent(cli: Cli): Promise<void> {
  const inputManifest = JSON.parse(readFileSync(cli.sourceManifest, 'utf8')) as Json;
  const inputSize = statSync(cli.input).size;
  if (
    inputManifest.schemaVersion !== 2 || inputManifest.dataset !== SOURCE_DATASET ||
    inputManifest.outputRows !== 999_416 || inputManifest.sourceRowsRead !== 1_000_000 ||
    inputManifest.normalizedTextGroups !== 996_111 || inputManifest.containsSyntheticData !== false
  ) throw new Error('Refusing a source corpus that is not the audited full local Divar fact corpus.');
  if (dirname(cli.output) !== dirname(cli.manifest) || cli.output === cli.input || cli.manifest === cli.input || cli.manifest === cli.sourceManifest || cli.output === cli.sourceManifest || existsSync(cli.output) || existsSync(cli.manifest)) {
    throw new Error('Output paths must be new, distinct from inputs, and colocated.');
  }
  const inputHash = await sha256File(cli.input);
  if (interruptRequested) {
    process.exitCode = 130;
    return;
  }
  const questions = buildDivarLayaBatchQuestions();
  const questionHash = sha256Text(JSON.stringify(questions));
  const questionFactory = {
    questionFactoryVersion: 3,
    hypotheticalNeedQuestions: questions,
    hypotheticalNeedQuestionSchemaSha256: questionHash,
    hypotheticalNeeds: true,
    hypotheticalTask: cli.semanticsVersion === 6 ? DIVAR_HYPOTHETICAL_NEED_V6_TASK : DIVAR_HYPOTHETICAL_NEED_TASK,
    hypotheticalTemplateVersion: cli.semanticsVersion,
    inferenceInput: 'original_divar_offer_text',
    sourceOfferAttributesVersion: 1,
    outputSemanticsVersion: cli.semanticsVersion,
  };
  const questionFactoryBaseSha256 = sha256Text(JSON.stringify(questionFactory));
  const workerCount = Math.min(cli.workers, Math.max(1, Math.floor(inputSize / (64 * 1024 * 1024))));
  const ranges = workerCount === 1 ? [{ start: 0, end: inputSize - 1 }] : getByteRanges(cli.input, workerCount);
  const partPrefix = `${cli.output}.part-${process.pid}`;
  const parts = ranges.map((range, index) => ({
    ...range,
    path: `${partPrefix}-${index + 1}.jsonl`,
  }));
  if (parts.some((part) => existsSync(part.path))) throw new Error('A worker-part path already exists; refusing to overwrite it.');

  console.log(`Generating source-grounded hypothetical examples locally: workers=${parts.length}, source_bytes=${inputSize}`);
  const results = await Promise.all(parts.map((part, index) => spawnWorker([
    '--input', cli.input,
    '--source-manifest', cli.sourceManifest,
    '--output', cli.output,
    '--manifest', cli.manifest,
    '--workers', '1',
    '--worker-start-byte', String(part.start),
    '--worker-end-byte', String(part.end),
    '--worker-part-output', part.path,
    '--question-hash', questionHash,
    '--semantics-version', String(cli.semanticsVersion),
  ], index + 1)));
  if (interruptRequested) {
    for (const part of parts) if (existsSync(part.path)) unlinkSync(part.path);
    process.exitCode = 130;
    return;
  }
  for (const [index, result] of results.entries()) {
    if (result.code !== 0 || !result.stdout) {
      for (const part of parts) if (existsSync(part.path)) unlinkSync(part.path);
      throw new Error(`Corpus worker ${index + 1} failed: ${result.stderr.slice(-2_000)}`);
    }
  }
  const workerStats = results.map((result) => JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '{}') as Json);
  const sourceRowsRead = workerStats.reduce((sum, item) => sum + Number(item.rowsRead ?? 0), 0);
  const proposalsBuilt = workerStats.reduce((sum, item) => sum + Number(item.proposals ?? 0), 0);
  const skippedInvalid = workerStats.reduce((sum, item) => sum + Number(item.skipped ?? 0), 0);
  if (sourceRowsRead !== inputManifest.outputRows || proposalsBuilt + skippedInvalid !== sourceRowsRead) {
    throw new Error('Worker row accounting does not reconcile with the normalized source manifest.');
  }

  const sourceGroupIndex = new Map<string, {
    fingerprint: string; split: string; conflicting: boolean; indexed: boolean; emitted: boolean;
  }>();
  let sourceDuplicateRows = 0;
  let conflictingSourceRows = 0;
  for (const part of parts) {
    const lines = createInterface({ input: createReadStream(part.path, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Json;
      const group = sourceGroup(row);
      const fingerprint = labelFingerprint(row);
      const split = String(row.hypotheticalNeed.originalSplit);
      const prior = sourceGroupIndex.get(group);
      if (!prior) sourceGroupIndex.set(group, { fingerprint, split, conflicting: false, indexed: false, emitted: false });
      else {
        sourceDuplicateRows += 1;
        if (prior.fingerprint !== fingerprint || prior.split !== split) {
          conflictingSourceRows += 1;
          prior.conflicting = true;
        }
      }
    }
  }
  let conflictingSourceGroupCount = 0;
  for (const group of sourceGroupIndex.values()) if (group.conflicting) conflictingSourceGroupCount += 1;

  // Group the exact normalized model input, not just its source ad. This is
  // the boundary that prevents generated duplicates leaking across eval splits.
  const stateGroupIndex = new Map<string, TrainingStateGroup>();
  for (const part of parts) {
    const lines = createInterface({ input: createReadStream(part.path, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Json;
      const sourceInfo = sourceGroupIndex.get(sourceGroup(row));
      if (!sourceInfo || sourceInfo.conflicting || sourceInfo.indexed) continue;
      sourceInfo.indexed = true;
      observeTrainingStateGroup(stateGroupIndex, row);
    }
  }
  let conflictingStateGroupCount = 0;
  let duplicateStateRowsCollapsed = 0;
  let conflictingStateRowsQuarantined = 0;
  for (const group of stateGroupIndex.values()) {
    duplicateStateRowsCollapsed += group.rows - 1;
    if (group.conflicting) {
      conflictingStateGroupCount += 1;
      conflictingStateRowsQuarantined += group.rows;
    }
  }

  const tempOutput = `${cli.output}.partial-${process.pid}`;
  const outputFd = openSync(tempOutput, 'wx', 0o600);
  let pending = '';
  let outputRows = 0;
  let quarantinedStateGroups = 0;
  const trainingSplitCounts: Record<string, number> = {};
  const sourceSplitCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const decisionCounts: Record<string, Record<string, number>> = {};
  try {
    for (const part of parts) {
      const lines = createInterface({ input: createReadStream(part.path, { encoding: 'utf8' }), crlfDelay: Infinity });
      for await (const line of lines) {
        if (!line.trim()) continue;
        const row = JSON.parse(line) as Json;
        const sourceInfo = sourceGroupIndex.get(sourceGroup(row));
        if (!sourceInfo) throw new Error('Dedup group index lost a generated source row.');
        if (sourceInfo.emitted) continue;
        sourceInfo.emitted = true;
        if (sourceInfo.conflicting) continue;
        const group = stateGroup(row);
        const groupInfo = stateGroupIndex.get(group);
        if (!groupInfo) throw new Error('Dedup group index lost a generated source row.');
        if (groupInfo.emitted) continue;
        groupInfo.emitted = true;
        if (groupInfo.conflicting) {
          quarantinedStateGroups += 1;
          continue;
        }
        row.hypotheticalNeed.trainingSplit = groupInfo.trainingSplit;
        pending += `${JSON.stringify(row)}\n`;
        outputRows += 1;
        const split = groupInfo.trainingSplit;
        trainingSplitCounts[split] = (trainingSplitCounts[split] ?? 0) + 1;
        const sourceSplit = String(row.hypotheticalNeed.originalSplit);
        sourceSplitCounts[sourceSplit] = (sourceSplitCounts[sourceSplit] ?? 0) + 1;
        const targets = row.hypotheticalNeed.targetDecisions as Json;
        categoryCounts[String(targets.category_candidate?.value)] = (categoryCounts[String(targets.category_candidate?.value)] ?? 0) + 1;
        const city = String(targets.city?.value ?? 'unknown');
        cityCounts[city] = (cityCounts[city] ?? 0) + 1;
        for (const key of TARGET_KEYS) {
          const value = String(targets[key]?.value ?? 'unknown');
          const field = decisionCounts[key] ??= {};
          field[value] = (field[value] ?? 0) + 1;
        }
        if (pending.length >= 1024 * 1024) pending = writeBuffered(outputFd, pending);
      }
    }
    if (pending) writeSync(outputFd, pending);
    fsyncSync(outputFd);
  } finally {
    closeSync(outputFd);
  }
  if (outputRows === 0 || outputRows + conflictingStateGroupCount !== stateGroupIndex.size || quarantinedStateGroups !== conflictingStateGroupCount) {
    throw new Error('Deduplicated output does not reconcile with unique normalized model-input groups.');
  }
  renameSync(tempOutput, cli.output);
  for (const part of parts) unlinkSync(part.path);

  const outputManifest = {
    schemaVersion: 2,
    status: 'complete',
    taskType: OUTPUT_TASKS[cli.semanticsVersion],
    model: MODEL,
    modelUse: 'local Laya question contract is used for future typed-decision training; this corpus builder does not call the model and does not use model predictions as labels',
    sourceDataset: SOURCE_DATASET,
    sourceDatasetSha256: inputManifest.datasetSha256,
    sourceCorpus: basename(cli.input),
    sourceCorpusSha256: inputHash,
    sourceCorpusBytes: inputSize,
    sourceRows: sourceRowsRead,
    proposalRowsBeforeDeduplication: proposalsBuilt,
    invalidProposalRowsSkipped: skippedInvalid,
    uniqueSourceGroups: sourceGroupIndex.size,
    sourceDuplicateRowsSkipped: sourceDuplicateRows,
    conflictingSourceGroupsQuarantined: conflictingSourceGroupCount,
    conflictingSourceDuplicateRows: conflictingSourceRows,
    uniqueNormalizedStateGroups: stateGroupIndex.size,
    duplicateStateRowsCollapsed,
    conflictingStateGroupsQuarantined: conflictingStateGroupCount,
    conflictingStateRowsQuarantined,
    outputRows,
    outputBytes: statSync(cli.output).size,
    outputSha256: await sha256File(cli.output),
    splitCounts: trainingSplitCounts,
    trainingSplitCounts,
    sourceSplitCounts,
    trainingSplitPolicy: TRAINING_SPLIT_POLICY,
    exactNormalizedStateGroupsDisjoint: true,
    categoryCounts,
    cityCounts,
    decisionCounts,
    questionFactory,
    questionFactoryBaseSha256,
    synthetic: true,
    derivedFromSupplyListing: true,
    realNeedGroundTruth: false,
    humanReviewed: false,
    trainingEligible: false,
    targetOrigin: 'deterministic_source_facts_not_laya_output',
    generation: cli.semanticsVersion === 6
      ? 'deterministic_counterfactual_template_v6; explicit structured long-term rent mode preserved, unknown when absent/incompatible; no seller price/rent/deposit amounts transferred to seeker preferences; exact city/neighborhood crosswalk only'
      : 'deterministic_counterfactual_template_v5; no seller price/rent/deposit transferred to seeker preferences; exact city/neighborhood crosswalk only',
    rightsAndPrivacy: 'local-only research artifact; Divar ODbL attribution/share-alike and individual-content/privacy review pending; no cloud transfer or redistribution authorized',
    layaPredictionsUsedAsLabels: false,
    createdAt: new Date().toISOString(),
  };
  const manifestFd = openSync(cli.manifest, 'wx', 0o600);
  try {
    writeSync(manifestFd, `${JSON.stringify(outputManifest, null, 2)}\n`);
    fsyncSync(manifestFd);
  } finally {
    closeSync(manifestFd);
  }
  console.log(JSON.stringify({
    status: 'complete', outputRows, sourceRowsRead,
    sourceDuplicateRowsSkipped: sourceDuplicateRows,
    duplicateStateRowsCollapsed,
    conflictingStateGroupsQuarantined: quarantinedStateGroups,
    output: cli.output, manifest: cli.manifest,
  }));
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (!existsSync(cli.input) || !existsSync(cli.sourceManifest)) throw new Error('Source JSONL or its audit manifest is missing.');
  if (cli.workerStart !== undefined) {
    if (!cli.questionHash || !cli.workerPartOutput || !/^[a-f0-9]{64}$/u.test(cli.questionHash)) throw new Error('Internal worker arguments are invalid.');
    const stats = await runWorker(cli, cli.workerPartOutput, cli.questionHash);
    console.log(JSON.stringify(stats));
    return;
  }
  await runParent(cli);
}

if (import.meta.main) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unexpected corpus build failure.';
    console.error(message);
    process.exitCode = 1;
  });
}

export { baseRow, labelFingerprint, sourceGroup, stateGroup, trainingSplitForState };
