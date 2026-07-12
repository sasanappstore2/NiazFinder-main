/**
 * CI diff guards — the machine-enforceable invariants of RFC-005 §17 that are pure predicates
 * over a git diff (MEI-04/05/08/09/10/11). Implements the CGP automation rule (ADR-079):
 * automation executes an actor's mechanical duties without acquiring authority — this script can
 * BLOCK a merge (exit 1), it can never approve anything (ADR-075).
 *
 * Runtime-artifact guards (MEI-01/02/03) live in the CCQS CLIs (persist-gate-verdict.ts,
 * run-integrity.ts), not here — they need the database; a diff cannot evaluate them.
 *
 * Usage: npx tsx scripts/ci/mei-guards.ts [baseRef]   (default base: HEAD~1; CI passes the PR base)
 */
import { execSync } from 'node:child_process';

const base = process.argv[2] ?? 'HEAD~1';

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' });
}
function changedFiles(): string[] {
  return sh(`git diff --name-only ${base} HEAD`).split('\n').filter(Boolean);
}
function fileAt(ref: string, path: string): string | null {
  try {
    return sh(`git show ${ref}:"${path}"`);
  } catch {
    return null;
  }
}

// Governed path sets (RFC-005 §3's surfaces, expressed as repo paths).
const ENGINE_PATHS = [/^src\/cognitive-engine\//, /^src\/intake\/rules\//, /^src\/intake\/intelligence-engine\//, /^src\/lib\/need-intake\/local-chat-client\.ts$/];
const INSTRUMENT_PATHS = [/^src\/ccqs\/golden-dataset\//, /^src\/ccqs\/gate\/default-gate-policy\.ts$/, /^src\/ccqs\/metrics\//];
const VERSION_AXIS_FILES = [
  'src/intake/rules/registry-version.ts',
  'src/cognitive-engine/canonical-need/build-canonical-need.ts',
  'src/intake/intelligence-engine/indexes/location-catalog-version.ts',
  'src/semantic-evaluation-engine/config.ts',
];
const INSULATION_FILES = ['src/semantic-evaluation-engine/config.ts', 'src/semantic-evaluation-engine/adapters/cognitive-to-snapshot.ts'];
// Historical Record tables (SEE INV-11 / CCQS §9 / RFC-005 §17 MEI-08): never UPDATEd/DELETEd.
const HISTORY_MUTATION_RE = /\b(ccqsComparisonRecord|ccqsGateVerdict|ccqsGatePolicy|ccqsMetricSnapshot|ccqsAlertEvent|ccqsEngineVersion)\s*\.\s*(update|updateMany|delete|deleteMany|upsert)\b/;

interface GuardResult {
  meiId: string;
  passed: boolean;
  detail: string;
}
const results: GuardResult[] = [];
const files = changedFiles();

// ── MEI-04: engine-behavior diff must bump ≥1 version axis ──────────────────
{
  const engineTouched = files.filter((f) => ENGINE_PATHS.some((re) => re.test(f)) && !VERSION_AXIS_FILES.includes(f));
  const axisTouched = files.some((f) => VERSION_AXIS_FILES.includes(f));
  results.push(
    engineTouched.length === 0
      ? { meiId: 'MEI-04', passed: true, detail: 'No governed engine path touched.' }
      : axisTouched
        ? { meiId: 'MEI-04', passed: true, detail: `Engine paths touched (${engineTouched.length}) and a version-axis file changed.` }
        : { meiId: 'MEI-04', passed: false, detail: `Engine paths touched without any version-axis bump: ${engineTouched.slice(0, 5).join(', ')} (RFC-004 §30 / CGP MEI-04)` }
  );
}

// ── MEI-05: instrument and engine surfaces never in one change ──────────────
{
  const engine = files.filter((f) => ENGINE_PATHS.some((re) => re.test(f)));
  const instrument = files.filter((f) => INSTRUMENT_PATHS.some((re) => re.test(f)));
  results.push(
    engine.length > 0 && instrument.length > 0
      ? { meiId: 'MEI-05', passed: false, detail: `Ruler and measured object in one diff (CIF ADR-063): engine=[${engine[0]}…] instrument=[${instrument[0]}…]` }
      : { meiId: 'MEI-05', passed: true, detail: 'Instrument/engine path disjointness holds.' }
  );
}

// ── MEI-08: no UPDATE/DELETE against Historical Record tables ───────────────
{
  const offenders: string[] = [];
  for (const f of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
    const content = fileAt('HEAD', f);
    if (content && HISTORY_MUTATION_RE.test(content)) offenders.push(f);
  }
  results.push(
    offenders.length
      ? { meiId: 'MEI-08', passed: false, detail: `History-mutation call introduced in: ${offenders.join(', ')} (SEE INV-11 / CCQS §9)` }
      : { meiId: 'MEI-08', passed: true, detail: 'No history-mutating call in changed files.' }
  );
}

// ── MEI-09: widening SEE's compared surface requires a determinism re-audit ─
{
  const insulationTouched = files.filter((f) => INSULATION_FILES.includes(f));
  const auditTouched = files.some((f) => /^PLAN\/replay-determinism-audit.*\.md$/.test(f));
  results.push(
    insulationTouched.length === 0
      ? { meiId: 'MEI-09', passed: true, detail: 'Insulation-relevant files untouched.' }
      : auditTouched
        ? { meiId: 'MEI-09', passed: true, detail: 'Insulation files changed WITH a determinism re-audit artifact.' }
        : { meiId: 'MEI-09', passed: false, detail: `${insulationTouched.join(', ')} changed without a determinism re-audit artifact (CIF ADR-072 / CIF-INV-08)` }
  );
}

// ── MEI-10: golden dataset — no caseId removed; every added case has a reason ─
{
  const datasetFiles = files.filter((f) => /^src\/ccqs\/golden-dataset\//.test(f));
  let passed = true;
  const details: string[] = [];
  for (const f of datasetFiles) {
    const before = fileAt(base, f) ?? '';
    const after = fileAt('HEAD', f) ?? '';
    const ids = (s: string) => new Set([...s.matchAll(/caseId:\s*'([^']+)'/g)].map((m) => m[1]!));
    const beforeIds = ids(before);
    const afterIds = ids(after);
    for (const id of beforeIds) {
      if (!afterIds.has(id)) {
        passed = false;
        details.push(`caseId '${id}' REMOVED from ${f} (deprecation-only, CCQS §1.1)`);
      }
    }
    // Every case object must carry a reason: count caseId occurrences vs reason occurrences.
    const caseCount = [...after.matchAll(/caseId:\s*'/g)].length;
    const reasonCount = [...after.matchAll(/reason:\s*'/g)].length;
    if (caseCount > reasonCount) {
      passed = false;
      details.push(`${f}: ${caseCount} cases but only ${reasonCount} reason fields (mandatory reason, CCQS §1.1)`);
    }
  }
  results.push({ meiId: 'MEI-10', passed, detail: datasetFiles.length ? details.join('; ') || 'Dataset changes conform (no removals, reasons present).' : 'Golden dataset untouched.' });
}

// ── MEI-11: gate-policy value change requires a policyVersion change ────────
{
  const policyFile = 'src/ccqs/gate/default-gate-policy.ts';
  if (!files.includes(policyFile)) {
    results.push({ meiId: 'MEI-11', passed: true, detail: 'Gate policy untouched.' });
  } else {
    const before = fileAt(base, policyFile) ?? '';
    const after = fileAt('HEAD', policyFile) ?? '';
    const ver = (s: string) => s.match(/policyVersion:\s*'([^']+)'/)?.[1] ?? null;
    const thresholds = (s: string) => s.match(/thresholds:\s*\{([\s\S]*?)\}/)?.[1]?.replace(/\s+/g, '') ?? null;
    const thresholdsChanged = thresholds(before) !== thresholds(after);
    const versionChanged = ver(before) !== ver(after);
    results.push(
      thresholdsChanged && !versionChanged
        ? { meiId: 'MEI-11', passed: false, detail: `Thresholds changed but policyVersion is still '${ver(after)}' — published policy versions are immutable (CCQS §1.6)` }
        : { meiId: 'MEI-11', passed: true, detail: thresholdsChanged ? `Thresholds changed WITH a new policyVersion ('${ver(before)}' → '${ver(after)}').` : 'Policy file touched without threshold changes.' }
    );
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
let failed = 0;
console.log(`MEI diff guards (base: ${base}, ${files.length} changed files)\n`);
for (const r of results) {
  console.log(`[${r.meiId}] ${r.passed ? 'OK     ' : 'BLOCKED'} ${r.detail}`);
  if (!r.passed) failed++;
}
if (failed) {
  console.error(`\n${failed} guard(s) BLOCKED. See RFC-005 §17 for the governing invariants.`);
  process.exit(1);
}
console.log('\nAll diff guards green.');
