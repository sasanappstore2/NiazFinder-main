/**
 * Typo stress test — the "all scenarios" gate for the fuzzy corrector.
 *
 * Injects seeded single-edit typos into every corpus scenario and measures how
 * many expected fields survive extraction with the fuzzy corrector ON vs OFF.
 * Deterministic (mulberry32 PRNG) so failures are reproducible.
 *
 * Run: npm run test:intake-typo-stress
 */
import { ALL_SMART_INTAKE_SCENARIOS } from './scenarios';
import {
  evaluateScenario,
  hashString,
  injectTypo,
  mulberry32,
} from './typo-sim';

// ---------- main ----------

const VARIANTS_PER_SCENARIO = 2;

async function main(): Promise<void> {
  const scenarios = ALL_SMART_INTAKE_SCENARIOS;
  const results = {
    clean: { ok: 0 },
    on: { ok: 0, total: 0 },
    off: { ok: 0, total: 0 },
  };
  const sampleFailures: string[] = [];

  for (const scenario of scenarios) {
    // clean baseline
    if ((await evaluateScenario(scenario, scenario.needText)).ok) results.clean.ok++;

    for (let v = 0; v < VARIANTS_PER_SCENARIO; v++) {
      const rng = mulberry32(hashString(`${scenario.id}:${v}`));
      const typo = injectTypo(scenario.needText, rng);
      if (!typo) continue;

      // corrector ON (default)
      results.on.total++;
      const on = await evaluateScenario(scenario, typo.text);
      if (on.ok) results.on.ok++;
      else if (sampleFailures.length < 12) {
        sampleFailures.push(`[${scenario.id} v${v}] word="${typo.word}" → ${on.failures.join(', ')}`);
      }

      // corrector OFF (kill switch) — regex aliases still active
      process.env.INTAKE_FUZZY_CORRECTOR = 'false';
      results.off.total++;
      if ((await evaluateScenario(scenario, typo.text)).ok) results.off.ok++;
      process.env.INTAKE_FUZZY_CORRECTOR = '';
    }
  }

  const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
  console.log(`\n=== Typo stress results (${scenarios.length} scenarios × ${VARIANTS_PER_SCENARIO} typos) ===`);
  console.log(`clean:                 ${results.clean.ok}/${scenarios.length} (${pct(results.clean.ok, scenarios.length).toFixed(1)}%)`);
  const onPct = pct(results.on.ok, results.on.total);
  const offPct = pct(results.off.ok, results.off.total);
  console.log(`typo, corrector ON:    ${results.on.ok}/${results.on.total} (${onPct.toFixed(1)}%)`);
  console.log(`typo, corrector OFF:   ${results.off.ok}/${results.off.total} (${offPct.toFixed(1)}%)`);
  console.log(`recovery: +${(onPct - offPct).toFixed(1)} percentage points`);

  if (sampleFailures.length) {
    console.log('\nSample failures (ON):');
    for (const f of sampleFailures) console.log('  ' + f);
  }

  const cleanOk = results.clean.ok === scenarios.length;
  const onOk = onPct >= 90 && onPct >= offPct;
  if (!cleanOk) {
    console.error('\n❌ clean corpus broke — corrector must not change clean-text results');
    process.exit(1);
  }
  if (!onOk) {
    console.error('\n❌ typo recovery below 90% or below OFF baseline');
    process.exit(1);
  }
  console.log('\n✅ typo stress gate passed (clean 100%, recovery ≥90% and > OFF baseline)');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
