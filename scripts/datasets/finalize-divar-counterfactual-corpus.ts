#!/usr/bin/env bun
/**
 * Validate, deduplicate and quarantine the completed local Divar/Si
 * counterfactual corpus. This never promotes the data to real need ground truth
 * or training-eligible examples.
 */
import {
  closeSync,
  createReadStream,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import {
  containsSiCorpusPiiPattern,
  siAuditTargetFingerprint,
  normalizeSiCorpusText,
  readSiCorpusAuditShape,
} from './si-corpus-audit-shape';
import { SiCorpusDedupIndex } from './si-corpus-dedup';

const MODEL = 'convaiinnovations/si-multilingual';
const OUTPUT_TASK = 'divar-counterfactual-post-need-si-proposal/v5';
const HYPOTHETICAL_TASK = 'divar-counterfactual-post-need-proposal/v5';
const SOURCE_DATASET = 'divarofficial/real_estate_ads';
const SOURCE_TYPE = 'seller_or_agent_property_offer';

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
const REQUIRED_TARGETS = [
  'category_candidate', 'property_kind', 'transaction_type', 'usage', 'city', 'neighborhood',
  'area', 'rooms', 'deed_type', 'parking', 'elevator', 'storage', 'budget', 'monthly_rent', 'deposit',
] as const;

type JsonObject = Record<string, unknown>;

type Cli = { input: string; manifest: string; output: string; quarantine: string };

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}

function parseArgs(argv: string[]): Cli {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--help') {
      console.log('Usage: bun scripts/datasets/finalize-divar-counterfactual-corpus.ts --input <completed.jsonl> --manifest <run.manifest.json> --output <unique.jsonl> --quarantine <conflicts.jsonl>');
      process.exit(0);
    }
    if (!['--input', '--manifest', '--output', '--quarantine'].includes(key)) {
      throw new Error('Unsupported argument.');
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    values.set(key, value);
    index += 1;
  }
  const input = values.get('--input');
  const manifest = values.get('--manifest');
  const output = values.get('--output');
  const quarantine = values.get('--quarantine');
  if (!input || !manifest || !output || !quarantine) throw new Error('All four path arguments are required.');
  return {
    input: resolve(input),
    manifest: resolve(manifest),
    output: resolve(output),
    quarantine: resolve(quarantine),
  };
}

function parseJsonObject(line: string, lineNumber: number): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error(`Malformed JSON at input line ${lineNumber}.`);
  }
  const row = asObject(parsed);
  if (!row) throw new Error(`Expected a JSON object at input line ${lineNumber}.`);
  return row;
}

function validateRow(row: JsonObject, lineNumber: number, expectedNeedQuestionHash: string): {
  textDigest: string;
  targetFingerprint: string;
  category: string;
  city?: string;
  neighborhood?: string;
} {
  const source = asObject(row.source);
  const si = asObject(row.si);
  const hypothetical = asObject(row.hypotheticalNeed);
  const generation = asObject(hypothetical?.generation);
  const targets = asObject(hypothetical?.targetDecisions);
  const shape = readSiCorpusAuditShape(row);
  const invalid = () => new Error(`Counterfactual row contract failed at input line ${lineNumber}.`);

  if (
    row.taskType !== OUTPUT_TASK || row.synthetic !== true || row.derivedFromSupplyListing !== true ||
    row.isNeedGroundTruth !== false || row.realNeedGroundTruth !== false || row.trainingEligible !== false ||
    row.shadowOnly !== true || hypothetical?.taskType !== HYPOTHETICAL_TASK ||
    hypothetical.realNeedGroundTruth !== false || hypothetical.trainingEligible !== false ||
    row.schemaVersion !== 5 || hypothetical.schemaVersion !== 5 || generation?.version !== 5 ||
    typeof row.exampleId !== 'string' || !row.exampleId.trim() || hypothetical.exampleId !== row.exampleId ||
    source?.dataset !== SOURCE_DATASET || source.sourceType !== SOURCE_TYPE ||
    typeof source.sourceExampleId !== 'string' || !source.sourceExampleId.trim() ||
    typeof source.normalizedTextGroupSha256 !== 'string' ||
    si?.model !== MODEL || !shape.text || shape.text.length > 8_000 ||
    si.inputStateKind !== 'original_divar_offer_text' ||
    typeof si.inputStateSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(si.inputStateSha256) ||
    hypothetical.questionSchemaSha256 !== expectedNeedQuestionHash ||
    containsSiCorpusPiiPattern(shape.text) || row.stateTruncated === true || !targets
  ) throw invalid();

  for (const key of REQUIRED_TARGETS) {
    const decision = asObject(targets[key]);
    if (!decision || !Object.hasOwn(decision, 'value') || typeof decision.source !== 'string') throw invalid();
  }
  const category = shape.category;
  const targetFingerprint = siAuditTargetFingerprint(targets);
  if (!category || !targetFingerprint) throw invalid();

  const normalized = normalizeSiCorpusText(shape.text);
  if (!normalized) throw invalid();
  return {
    textDigest: createHash('sha256').update(normalized).digest('hex'),
    targetFingerprint,
    category,
    city: shape.city,
    neighborhood: shape.neighborhood,
  };
}

async function readLines(path: string, visit: (line: string, lineNumber: number) => void | Promise<void>): Promise<void> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (line.trim()) await visit(line, lineNumber);
  }
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

function validateRunManifest(manifest: JsonObject): string {
  const contract = asObject(manifest.questionFactory);
  const needQuestions = asObject(contract?.hypotheticalNeedQuestions);
  if (
    manifest.status !== 'complete' || manifest.taskType !== OUTPUT_TASK || manifest.model !== MODEL ||
    manifest.selection !== 'all' || manifest.selectionLimit !== null ||
    manifest.hypotheticalNeeds !== true || manifest.hypotheticalTask !== HYPOTHETICAL_TASK ||
    manifest.hypotheticalTemplateVersion !== 5 ||
    contract?.inferenceInput !== 'original_divar_offer_text' ||
    !needQuestions ||
    contract?.hypotheticalNeedQuestionSchemaSha256 !== sha256Text(JSON.stringify(needQuestions)) ||
    typeof manifest.questionFactoryBaseSha256 !== 'string' ||
    sha256Text(JSON.stringify(contract)) !== manifest.questionFactoryBaseSha256 ||
    typeof manifest.rowsProcessed !== 'number' || !Number.isSafeInteger(manifest.rowsProcessed) ||
    typeof manifest.sourceCorpusRows !== 'number' || !Number.isSafeInteger(manifest.sourceCorpusRows)
  ) {
    throw new Error('Input manifest is not a completed full-corpus run for the approved local task/model.');
  }
  const sourceAccounting = [
    manifest.rowsProcessed,
    manifest.skippedInvalidProposalRows ?? 0,
    manifest.skippedContactPatternRows ?? 0,
    manifest.duplicateTextGroupsSkipped ?? 0,
  ];
  if (sourceAccounting.some((count) => !Number.isSafeInteger(count) || Number(count) < 0)) {
    throw new Error('Completed run source-accounting counters are invalid.');
  }
  const auditedSourceCount = sourceAccounting.reduce((total, count) => total + Number(count), 0);
  if (auditedSourceCount !== manifest.sourceCorpusRows) {
    throw new Error('Completed run does not account for every source row as processed or explicitly skipped.');
  }
  return String(contract!.hypotheticalNeedQuestionSchemaSha256);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (!existsSync(cli.input) || !existsSync(cli.manifest)) throw new Error('Input JSONL or run manifest does not exist.');
  if (dirname(cli.input) !== dirname(cli.output) || dirname(cli.input) !== dirname(cli.quarantine)) {
    throw new Error('Output and quarantine must stay beside the input corpus.');
  }
  if (new Set([cli.input, cli.manifest, cli.output, cli.quarantine]).size !== 4) {
    throw new Error('Input, manifest, output, and quarantine paths must be distinct.');
  }
  const outputManifestPath = `${cli.output}.manifest.json`;
  const finalPaths = [cli.output, cli.quarantine, outputManifestPath];
  if (finalPaths.some((path) => path === cli.input || path === cli.manifest) || new Set(finalPaths).size !== finalPaths.length) {
    throw new Error('Output artifacts must not overlap the source corpus or run manifest.');
  }
  if (finalPaths.some(existsSync)) throw new Error('Refusing to overwrite an existing output artifact.');

  const runManifest = asObject(JSON.parse(readFileSync(cli.manifest, 'utf8')));
  if (!runManifest) throw new Error('Run manifest must be a JSON object.');
  const expectedNeedQuestionHash = validateRunManifest(runManifest);
  if (statSync(cli.input).size !== runManifest.outputBytes) {
    throw new Error('Completed run manifest byte count does not match the source corpus file.');
  }

  const index = new SiCorpusDedupIndex();
  const categories = new Set<string>();
  const cities = new Set<string>();
  const neighborhoods = new Set<string>();
  let auditedRows = 0;
  await readLines(cli.input, (line, lineNumber) => {
    const row = parseJsonObject(line, lineNumber);
    const checked = validateRow(row, lineNumber, expectedNeedQuestionHash);
    index.observe(checked.textDigest, checked.targetFingerprint, lineNumber);
    categories.add(checked.category);
    if (checked.city) cities.add(checked.city);
    if (checked.neighborhood) neighborhoods.add(checked.neighborhood);
    auditedRows += 1;
  });

  if (auditedRows !== runManifest.rowsProcessed || auditedRows === 0) {
    throw new Error('Completed run manifest row count does not match the corpus.');
  }

  const tempSuffix = `.partial-${process.pid}-${randomUUID()}`;
  const tempOutput = `${cli.output}${tempSuffix}`;
  const tempQuarantine = `${cli.quarantine}${tempSuffix}`;
  const tempManifest = `${outputManifestPath}${tempSuffix}`;
  let outputFd: number | undefined;
  let quarantineFd: number | undefined;
  let manifestFd: number | undefined;
  const createdTemps = new Set<string>();
  const createdFinals = new Set<string>();
  let outputBuffer = '';
  let quarantineBuffer = '';
  let keptRows = 0;
  let quarantinedRows = 0;
  let duplicateRowsCollapsed = 0;
  const categoriesInOutput = new Set<string>();
  const citiesInOutput = new Set<string>();
  const neighborhoodsInOutput = new Set<string>();

  try {
    outputFd = openSync(tempOutput, 'wx');
    createdTemps.add(tempOutput);
    quarantineFd = openSync(tempQuarantine, 'wx');
    createdTemps.add(tempQuarantine);

    await readLines(cli.input, (line, lineNumber) => {
      const row = parseJsonObject(line, lineNumber);
      const checked = validateRow(row, lineNumber, expectedNeedQuestionHash);
      const group = index.get(checked.textDigest);
      if (!group) throw new Error('Dedup index lost a validated source row.');

      if (group.conflict) {
        const quarantined = {
          ...row,
          corpusAudit: {
            schemaVersion: 1,
            status: 'quarantined',
            reason: 'conflicting-targets-for-normalized-text',
            normalizedTextSha256: checked.textDigest,
          },
        };
        quarantineBuffer += `${JSON.stringify(quarantined)}\n`;
        quarantinedRows += 1;
        if (quarantineBuffer.length >= 1024 * 1024) {
          quarantineBuffer = writeBuffered(quarantineFd!, quarantineBuffer);
        }
        return;
      }

      if (group.firstLine !== lineNumber) {
        duplicateRowsCollapsed += 1;
        return;
      }
      const accepted = {
        ...row,
        corpusAudit: {
          schemaVersion: 1,
          status: 'unique-counterfactual-proposal-not-training-eligible',
          normalizedTextSha256: checked.textDigest,
          targetFingerprint: checked.targetFingerprint,
        },
      };
      outputBuffer += `${JSON.stringify(accepted)}\n`;
      keptRows += 1;
      categoriesInOutput.add(checked.category);
      if (checked.city) citiesInOutput.add(checked.city);
      if (checked.neighborhood) neighborhoodsInOutput.add(checked.neighborhood);
      if (outputBuffer.length >= 1024 * 1024) outputBuffer = writeBuffered(outputFd!, outputBuffer);
    });

    if (outputBuffer) writeSync(outputFd, outputBuffer);
    if (quarantineBuffer) writeSync(quarantineFd, quarantineBuffer);
    fsyncSync(outputFd);
    fsyncSync(quarantineFd);
    closeSync(outputFd);
    closeSync(quarantineFd);
    outputFd = undefined;
    quarantineFd = undefined;

    if (finalPaths.some(existsSync)) throw new Error('An output artifact appeared during processing; refusing to overwrite it.');
    renameSync(tempOutput, cli.output);
    createdTemps.delete(tempOutput);
    createdFinals.add(cli.output);
    renameSync(tempQuarantine, cli.quarantine);
    createdTemps.delete(tempQuarantine);
    createdFinals.add(cli.quarantine);

    const outputManifest = {
      schemaVersion: 1,
      status: 'complete',
      taskType: OUTPUT_TASK,
      derivedTask: HYPOTHETICAL_TASK,
      model: MODEL,
      sourceRunManifest: basename(cli.manifest),
      sourceRunStatus: runManifest.status,
      sourceRowsAudited: auditedRows,
      uniqueNormalizedTextGroups: index.uniqueTextGroups,
      keptUniqueCounterfactualRows: keptRows,
      duplicateRowsCollapsed,
      conflictingTextGroupsQuarantined: index.conflictingTextGroups,
      conflictingRowsQuarantined: quarantinedRows,
      categoryCount: categories.size,
      cityCount: cities.size,
      neighborhoodCount: neighborhoods.size,
      keptCoverage: {
        categories: categoriesInOutput.size,
        cities: citiesInOutput.size,
        neighborhoods: neighborhoodsInOutput.size,
      },
      synthetic: true,
      derivedFromSupplyListing: true,
      realNeedGroundTruth: false,
      trainingEligible: false,
      rightsReview: 'pending',
      textPiiRegexFindings: 0,
      outputs: { unique: basename(cli.output), quarantine: basename(cli.quarantine) },
      createdAt: new Date().toISOString(),
    };
    manifestFd = openSync(tempManifest, 'wx');
    createdTemps.add(tempManifest);
    writeSync(manifestFd, `${JSON.stringify(outputManifest, null, 2)}\n`);
    fsyncSync(manifestFd);
    closeSync(manifestFd);
    manifestFd = undefined;
    if (existsSync(outputManifestPath)) throw new Error('Output manifest appeared during processing; refusing to overwrite it.');
    renameSync(tempManifest, outputManifestPath);
    createdTemps.delete(tempManifest);
    createdFinals.add(outputManifestPath);
    createdFinals.clear();

    console.log(JSON.stringify({
      status: 'complete',
      sourceRowsAudited: auditedRows,
      keptUniqueCounterfactualRows: keptRows,
      duplicateRowsCollapsed,
      conflictingTextGroupsQuarantined: index.conflictingTextGroups,
      conflictingRowsQuarantined: quarantinedRows,
      eligibleForTraining: false,
      outputManifest: basename(outputManifestPath),
    }, null, 2));
  } catch (error) {
    if (outputFd !== undefined) closeSync(outputFd);
    if (quarantineFd !== undefined) closeSync(quarantineFd);
    if (manifestFd !== undefined) closeSync(manifestFd);
    for (const path of createdTemps) {
      if (existsSync(path)) unlinkSync(path);
    }
    for (const path of createdFinals) {
      if (existsSync(path)) unlinkSync(path);
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown finalization error.';
  console.error(message);
  process.exitCode = 1;
});
