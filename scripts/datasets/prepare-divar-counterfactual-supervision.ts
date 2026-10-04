#!/usr/bin/env bun
/**
 * Build a separately marked, source-derived supervision candidate for an
 * offline synthetic-only Laya experiment. Laya predictions are never labels.
 */
import {
  closeSync,
  createReadStream,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

const MODEL = 'convaiinnovations/laya-multilingual';
const INPUT_TASK = 'divar-counterfactual-post-need-laya-proposal/v5';
const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const OUTPUT_TASK = 'divar-counterfactual-typed-supervision-candidate/v5';
const TARGET_KEYS = [
  'category_candidate', 'property_kind', 'transaction_type', 'deed_type',
  'usage', 'parking', 'elevator', 'storage',
] as const;

type Json = Record<string, any>;
type Cli = { input: string; proposalManifest: string; runManifest: string; output: string; manifest: string };

function parseArgs(argv: string[]): Cli {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--help') {
      console.log('Usage: bun scripts/datasets/prepare-divar-counterfactual-supervision.ts --input <finalized-unique-proposals.jsonl> --proposal-manifest <finalized.manifest.json> --run-manifest <full-run.manifest.json> --output <candidate.jsonl> --manifest <candidate.manifest.json>');
      process.exit(0);
    }
    if (!['--input', '--proposal-manifest', '--run-manifest', '--output', '--manifest'].includes(key)) {
      throw new Error('Unsupported argument.');
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    values.set(key, value);
    index += 1;
  }
  const input = values.get('--input');
  const proposalManifest = values.get('--proposal-manifest');
  const runManifest = values.get('--run-manifest');
  const output = values.get('--output');
  const manifest = values.get('--manifest');
  if (!input || !proposalManifest || !runManifest || !output || !manifest) throw new Error('All five paths are required.');
  return {
    input: resolve(input),
    proposalManifest: resolve(proposalManifest),
    runManifest: resolve(runManifest),
    output: resolve(output),
    manifest: resolve(manifest),
  };
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function validateRunManifest(manifest: Json): Json {
  const contract = manifest.questionFactory;
  const questions = contract?.hypotheticalNeedQuestions;
  if (
    manifest.status !== 'complete' || manifest.taskType !== INPUT_TASK ||
    manifest.model !== MODEL || manifest.selection !== 'all' || manifest.selectionLimit !== null ||
    contract?.hypotheticalNeeds !== true ||
    contract?.hypotheticalTask !== 'divar-counterfactual-post-need-proposal/v5' ||
    contract?.hypotheticalTemplateVersion !== 5 ||
    contract?.inferenceInput !== 'original_divar_offer_text' ||
    typeof questions !== 'object' || !questions || Array.isArray(questions) ||
    typeof contract?.hypotheticalNeedQuestionSchemaSha256 !== 'string' ||
    sha256Text(JSON.stringify(questions)) !== contract.hypotheticalNeedQuestionSchemaSha256 ||
    typeof manifest.questionFactoryBaseSha256 !== 'string' ||
    sha256Text(JSON.stringify(contract)) !== manifest.questionFactoryBaseSha256
  ) {
    throw new Error('Input must be a complete, byte-matched full local Laya run with the fixed hypothetical question contract.');
  }
  return questions;
}

function buildSupervisionCandidate(row: Json, questions: Json, questionSchemaSha256: string): Json {
  const hypothetical = row.hypotheticalNeed;
  const source = row.source;
  const targets = hypothetical?.targetDecisions;
  if (
    row.taskType !== INPUT_TASK || row.schemaVersion !== 5 || row.synthetic !== true || row.realNeedGroundTruth !== false ||
    row.isNeedGroundTruth !== false || row.trainingEligible !== false || row.shadowOnly !== true ||
    typeof row.exampleId !== 'string' || !row.exampleId.trim() ||
    row.laya?.model !== MODEL ||
    row.laya?.inputStateKind !== 'original_divar_offer_text' ||
    typeof row.laya?.inputStateSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(row.laya.inputStateSha256) ||
    typeof row.laya?.questionSchemaSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(row.laya.questionSchemaSha256) ||
    hypothetical?.realNeedGroundTruth !== false || hypothetical?.trainingEligible !== false ||
    hypothetical?.generation?.method !== 'deterministic-counterfactual-template' ||
    hypothetical?.generation?.version !== 5 ||
    hypothetical?.schemaVersion !== 5 ||
    hypothetical?.exampleId !== row.exampleId ||
    source?.dataset !== SOURCE_DATASET ||
    typeof source?.normalizedTextGroupSha256 !== 'string' ||
    hypothetical?.questionSchemaSha256 !== questionSchemaSha256 ||
    typeof row.state !== 'string' || !row.state.trim() ||
    typeof hypothetical?.originalSplit !== 'string' || !hypothetical.originalSplit.trim() ||
    !targets || typeof targets !== 'object' || Array.isArray(targets)
  ) {
    throw new Error('Proposal row does not match the explicitly synthetic Divar/Laya contract.');
  }

  const decisions: Json = {};
  for (const key of TARGET_KEYS) {
    const question = questions[key];
    const target = targets[key];
    const options = question?.type === 'choice' ? question.criteria : undefined;
    if (
      !question || question.type !== 'choice' ||
      !options || typeof options !== 'object' || Array.isArray(options) ||
      typeof target?.source !== 'string' ||
      !Object.hasOwn(target, 'value') ||
      typeof target.value !== 'string' ||
      !Object.hasOwn(options, target.value)
    ) {
      throw new Error(`Source-derived target for ${key} is missing or outside the exact Laya choice vocabulary.`);
    }
    const probabilities = Object.fromEntries(Object.keys(options).map((option) => [option, option === target.value ? 1 : 0]));
    decisions[key] = {
      target: target.value,
      targetSource: target.source,
      probabilities,
    };
  }

  return {
    schemaVersion: 5,
    taskType: OUTPUT_TASK,
    exampleId: hypothetical.exampleId,
    state: row.state,
    questionsSchemaSha256: questionSchemaSha256,
    decisions,
    split: hypothetical.originalSplit,
    sourceGroupSha256: source.normalizedTextGroupSha256,
    source: {
      dataset: source.dataset,
      datasetSha256: source.datasetSha256,
      sourceRowOrdinal: source.sourceRowOrdinal,
      sourceExampleId: source.sourceExampleId,
      sourceType: source.sourceType,
      targetOrigin: 'deterministic_source_facts_not_laya_output',
    },
    synthetic: true,
    realNeedGroundTruth: false,
    humanReviewed: false,
    auxiliaryResearchCandidate: true,
    trainingEligible: false,
    reviewStatus: 'pending_independent_quality_and_rights_review',
  };
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (![cli.input, cli.proposalManifest, cli.runManifest].every(existsSync)) {
    throw new Error('Finalized proposal corpus and both input manifests must exist.');
  }
  if (
    new Set([cli.input, cli.proposalManifest, cli.runManifest, cli.output, cli.manifest]).size !== 5 ||
    dirname(cli.output) !== dirname(cli.manifest) ||
    cli.output === cli.input || cli.output === cli.runManifest ||
    cli.output === cli.proposalManifest || cli.manifest === cli.input ||
    cli.manifest === cli.proposalManifest || cli.manifest === cli.runManifest ||
    existsSync(cli.output) || existsSync(cli.manifest)
  ) throw new Error('Output paths must be distinct, new, and in one directory.');

  const runManifest = JSON.parse(readFileSync(cli.runManifest, 'utf8')) as Json;
  const proposalManifest = JSON.parse(readFileSync(cli.proposalManifest, 'utf8')) as Json;
  const questions = validateRunManifest(runManifest);
  if (
    proposalManifest.status !== 'complete' ||
    proposalManifest.taskType !== INPUT_TASK ||
    proposalManifest.sourceRunStatus !== 'complete' ||
    proposalManifest.sourceRunManifest !== basename(cli.runManifest) ||
    proposalManifest.trainingEligible !== false ||
    proposalManifest.synthetic !== true ||
    proposalManifest.realNeedGroundTruth !== false ||
    typeof proposalManifest.keptUniqueCounterfactualRows !== 'number' ||
    statSync(cli.input).size !== proposalManifest.artifactBytes
  ) throw new Error('Input must be the byte-matched unique output of the full-run counterfactual finalizer.');
  const actualInputHash = await new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(cli.input);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
  if (actualInputHash !== proposalManifest.artifactSha256) throw new Error('Finalized proposal SHA-256 does not match its manifest.');
  const questionSchemaSha256 = sha256Text(JSON.stringify(questions));
  const outputTemp = `${cli.output}.partial-${process.pid}-${randomUUID()}`;
  const manifestTemp = `${cli.manifest}.partial-${process.pid}-${randomUUID()}`;
  let outputFd: number | undefined;
  let manifestFd: number | undefined;
  let outputRows = 0;
  let pending = '';
  const seenGroups = new Set<string>();

  try {
    outputFd = openSync(outputTemp, 'wx', 0o600);
    const lines = createInterface({ input: createReadStream(cli.input, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      let row: Json;
      try {
        row = JSON.parse(line) as Json;
      } catch {
        throw new Error(`Malformed proposal JSON at line ${outputRows + 1}.`);
      }
      const candidate = buildSupervisionCandidate(row, questions, questionSchemaSha256);
      const group = candidate.source.sourceGroupSha256 as string;
      if (seenGroups.has(group)) throw new Error('Unique proposal input contains a repeated source group.');
      seenGroups.add(group);
      pending += `${JSON.stringify(candidate)}\n`;
      outputRows += 1;
      if (pending.length >= 1024 * 1024) {
        writeSync(outputFd, pending);
        pending = '';
      }
    }
    if (pending) writeSync(outputFd, pending);
    if (outputRows === 0 || outputRows !== proposalManifest.keptUniqueCounterfactualRows) {
      throw new Error('Candidate rows do not reconcile to the finalized unique proposal manifest.');
    }
    closeSync(outputFd);
    outputFd = undefined;

    const outputManifest = {
      schemaVersion: 1,
      status: 'complete',
      taskType: OUTPUT_TASK,
      sourceRunManifest: basename(cli.runManifest),
      sourceRunStatus: runManifest.status,
      finalizedProposalManifest: basename(cli.proposalManifest),
      sourceRowsAudited: proposalManifest.sourceRowsAudited,
      sourceRows: outputRows,
      uniqueSourceGroups: seenGroups.size,
      questionSchemaSha256,
      questionKeys: TARGET_KEYS,
      targetOrigin: 'deterministic_source_facts_not_laya_output',
      modelForFutureExperiment: MODEL,
      synthetic: true,
      realNeedGroundTruth: false,
      humanReviewed: false,
      auxiliaryResearchCandidate: true,
      trainingEligible: false,
      rightsAndPrivacyReview: 'pending; local-only; no redistribution or cloud transfer authorized',
      layaPredictionsUsedAsTargets: false,
      outputBytes: statSync(outputTemp).size,
      outputSha256: await new Promise<string>((resolveHash, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(outputTemp);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolveHash(hash.digest('hex')));
      }),
      createdAt: new Date().toISOString(),
    };
    manifestFd = openSync(manifestTemp, 'wx', 0o600);
    writeSync(manifestFd, `${JSON.stringify(outputManifest, null, 2)}\n`);
    closeSync(manifestFd);
    manifestFd = undefined;
    if (existsSync(cli.output) || existsSync(cli.manifest)) throw new Error('Output appeared during generation; refusing to overwrite it.');
    renameSync(outputTemp, cli.output);
    renameSync(manifestTemp, cli.manifest);
    console.log(JSON.stringify(outputManifest, null, 2));
  } catch (error) {
    if (outputFd !== undefined) closeSync(outputFd);
    if (manifestFd !== undefined) closeSync(manifestFd);
    if (existsSync(outputTemp)) unlinkSync(outputTemp);
    if (existsSync(manifestTemp)) unlinkSync(manifestTemp);
    throw error;
  }
}

if (import.meta.main) await main();

export { buildSupervisionCandidate };
