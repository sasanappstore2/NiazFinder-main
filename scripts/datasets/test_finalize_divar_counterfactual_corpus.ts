import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const MODEL = 'convaiinnovations/si-multilingual';
const OUTPUT_TASK = 'divar-counterfactual-post-need-si-proposal/v5';
const HYPOTHETICAL_TASK = 'divar-counterfactual-post-need-proposal/v5';
const needQuestionHash = createHash('sha256').update('{}').digest('hex');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function target(value: unknown) {
  return { value, source: 'test-fixture-not-gold', humanReviewed: false };
}

function row(id: string, state: string, area: number) {
  return {
    schemaVersion: 5,
    taskType: OUTPUT_TASK,
    exampleId: `${id}:counterfactual-v5`,
    synthetic: true,
    derivedFromSupplyListing: true,
    isNeedGroundTruth: false,
    realNeedGroundTruth: false,
    trainingEligible: false,
    shadowOnly: true,
    source: {
      dataset: 'divarofficial/real_estate_ads',
      sourceType: 'seller_or_agent_property_offer',
      sourceExampleId: id,
      normalizedTextGroupSha256: `source-group-${id}`,
    },
    state,
    stateTruncated: false,
    hypotheticalNeed: {
      taskType: HYPOTHETICAL_TASK,
      schemaVersion: 5,
      exampleId: `${id}:counterfactual-v5`,
      realNeedGroundTruth: false,
      trainingEligible: false,
      generation: { version: 5 },
      questionSchemaSha256: needQuestionHash,
      targetDecisions: {
        category_candidate: target('apartment-rent'),
        property_kind: target('apartment'),
        transaction_type: target('rent_monthly'),
        usage: target('unknown'),
        city: target('mashhad'),
        neighborhood: target('unknown'),
        area: target(area),
        rooms: target('unknown'),
        deed_type: target('unknown'),
        parking: target('unknown'),
        elevator: target('unknown'),
        storage: target('unknown'),
        budget: target('unknown'),
        monthly_rent: target('unknown'),
        deposit: target('unknown'),
      },
    },
    si: {
      model: MODEL,
      answers: {},
      inputStateKind: 'original_divar_offer_text',
      inputStateSha256: 'a'.repeat(64),
      source: 'unreviewed_offer_extraction_proposal_not_gold',
    },
    siDerivedHypotheticalNeed: {
      state: 'برای اجارهٔ مغازه در مشهد دنبال فضای کاری هستم.',
      trainingEligible: false,
      realNeedGroundTruth: false,
      decisions: {
        category_candidate: { value: 'shop-rent' },
        property_kind: { value: 'shop' },
        transaction_type: { value: 'rent_rahn_ejare' },
      },
    },
  };
}

const temp = mkdtempSync(join(tmpdir(), 'si-corpus-finalize-test-'));
try {
  const input = join(temp, 'input.jsonl');
  const runManifestPath = `${input}.manifest.json`;
  const output = join(temp, 'unique.jsonl');
  const quarantine = join(temp, 'quarantine.jsonl');
  const rows = [
    row('one', 'فرضی آپارتمان برای اجاره می‌خواهم.', 100),
    row('two', 'فرضی آپارتمان برای اجاره می‌خواهم.', 100),
    row('three', 'فرضی یک واحد، محله مشخص می‌خواهم.', 120),
    row('four', 'فرضی یک واحد محله مشخص می‌خواهم', 130),
  ];
  const inputText = `${rows.map((item) => JSON.stringify(item)).join('\n')}\n`;
  writeFileSync(input, inputText, { flag: 'wx' });
  const questionFactory = {
    inferenceInput: 'original_divar_offer_text',
    questions: {},
    hypotheticalNeedQuestions: {},
    hypotheticalNeedQuestionSchemaSha256: needQuestionHash,
  };
  writeFileSync(runManifestPath, JSON.stringify({
    status: 'complete',
    taskType: OUTPUT_TASK,
    model: MODEL,
    selection: 'all',
    selectionLimit: null,
    hypotheticalNeeds: true,
    hypotheticalTask: HYPOTHETICAL_TASK,
    hypotheticalTemplateVersion: 5,
    questionFactory,
    questionFactoryBaseSha256: createHash('sha256').update(JSON.stringify(questionFactory)).digest('hex'),
    rowsProcessed: rows.length,
    sourceCorpusRows: rows.length,
    outputBytes: Buffer.byteLength(inputText),
    skippedInvalidProposalRows: 0,
    skippedContactPatternRows: 0,
    duplicateTextGroupsSkipped: 0,
  }), { flag: 'wx' });

  const script = resolve('scripts/datasets/finalize-divar-counterfactual-corpus.ts');
  const result = spawnSync(process.execPath, [
    script,
    '--input', input,
    '--manifest', runManifestPath,
    '--output', output,
    '--quarantine', quarantine,
  ], { encoding: 'utf8' });
  assert(result.status === 0, `valid completed fixture should finalize: ${result.stderr}`);
  const summary = JSON.parse(result.stdout) as Record<string, unknown>;
  assert(summary.keptUniqueCounterfactualRows === 1, 'same-target duplicate text should produce one kept row');
  assert(summary.duplicateRowsCollapsed === 1, 'one same-target duplicate should be counted as collapsed');
  assert(summary.conflictingTextGroupsQuarantined === 1, 'conflicting target group should be quarantined');
  assert(summary.conflictingRowsQuarantined === 2, 'all rows in a conflicting group should be quarantined');
  const kept = readFileSync(output, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const quarantined = readFileSync(quarantine, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert(kept.length === 1 && kept[0].trainingEligible === false, 'kept proposal must remain explicitly ineligible');
  assert(kept[0].hypotheticalNeed.targetDecisions.category_candidate.value === 'apartment-rent', 'finalized labels must come from the deterministic source-fact reference, never the separate Si proposal');
  assert(kept[0].siDerivedHypotheticalNeed.decisions.category_candidate.value === 'shop-rent', 'the Si-derived proposal must remain independently inspectable');
  assert(quarantined.length === 2 && quarantined.every((item) => item.corpusAudit.status === 'quarantined'), 'conflicts must remain inspectable in quarantine');

  const incompleteInput = join(temp, 'running.jsonl');
  const incompleteManifest = `${incompleteInput}.manifest.json`;
  const incompleteOutput = join(temp, 'should-not-exist.jsonl');
  const incompleteQuarantine = join(temp, 'should-not-exist-quarantine.jsonl');
  writeFileSync(incompleteInput, `${JSON.stringify(rows[0])}\n`, { flag: 'wx' });
  writeFileSync(incompleteManifest, JSON.stringify({
    status: 'running', taskType: OUTPUT_TASK, model: MODEL, selection: 'all', selectionLimit: null,
    hypotheticalNeeds: true, hypotheticalTask: HYPOTHETICAL_TASK, rowsProcessed: 1,
    sourceCorpusRows: 1, outputBytes: Buffer.byteLength(`${JSON.stringify(rows[0])}\n`),
    skippedInvalidProposalRows: 0, skippedContactPatternRows: 0, duplicateTextGroupsSkipped: 0,
  }), { flag: 'wx' });
  const rejected = spawnSync(process.execPath, [
    script,
    '--input', incompleteInput,
    '--manifest', incompleteManifest,
    '--output', incompleteOutput,
    '--quarantine', incompleteQuarantine,
  ], { encoding: 'utf8' });
  assert(rejected.status !== 0, 'running manifests must not be finalized');
  assert(!existsSync(incompleteOutput) && !existsSync(incompleteQuarantine), 'rejected run must not create output files');

  console.log('Divar counterfactual finalizer: 11 checks passed');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
