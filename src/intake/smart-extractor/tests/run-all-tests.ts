/**
 * Smart Intake 100-case suite runner (Claude Step 5)
 * Run: npm run test:smart-intake
 */

import { extractSmartFields } from '../smart-field-extractor';
import {
  ALL_SMART_INTAKE_SCENARIOS,
  type ExpectedField,
  type SmartIntakeScenario,
} from './scenarios';

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function checkField(
  result: unknown,
  field: ExpectedField
): { ok: boolean; message: string } {
  const actual = getPath(result, field.path);

  if ('disambiguationNeeded' in field && field.disambiguationNeeded) {
    const needed = getPath(result, 'location.disambiguationNeeded') === true;
    const alts = getPath(result, 'location.alternatives');
    const altLen = Array.isArray(alts) ? alts.length : 0;
    const min = field.alternativesMin ?? 2;
    const ok = needed && altLen >= min;
    return {
      ok,
      message: ok
        ? 'disambiguation ok'
        : `disambiguationNeeded=${String(getPath(result, 'location.disambiguationNeeded'))} alts=${altLen} (need >=${min})`,
    };
  }

  if ('includes' in field && field.includes != null) {
    const ok = typeof actual === 'string' && actual.includes(field.includes);
    return {
      ok,
      message: ok ? 'ok' : `${field.path} includes "${field.includes}"? got=${JSON.stringify(actual)}`,
    };
  }

  if ('oneOf' in field && field.oneOf) {
    const ok = field.oneOf.some((v) => v === actual);
    return {
      ok,
      message: ok ? 'ok' : `${field.path} oneOf ${JSON.stringify(field.oneOf)} got=${JSON.stringify(actual)}`,
    };
  }

  if ('truthy' in field && field.truthy) {
    const ok = Boolean(actual);
    return { ok, message: ok ? 'ok' : `${field.path} expected truthy got=${JSON.stringify(actual)}` };
  }

  if ('equals' in field) {
    const ok = actual === field.equals;
    return {
      ok,
      message: ok ? 'ok' : `${field.path}: got=${JSON.stringify(actual)} expected=${JSON.stringify(field.equals)}`,
    };
  }

  return { ok: true, message: 'skipped' };
}

async function runScenario(scenario: SmartIntakeScenario): Promise<{
  passed: boolean;
  failures: string[];
  ms: number;
}> {
  const start = Date.now();
  const result = await extractSmartFields(scenario.needText, '', {
    preferredCity: scenario.preferredCity,
    preferredCitySlug: scenario.preferredCitySlug,
    useAI: false,
    useRules: true,
  });
  const ms = Date.now() - start;

  if (scenario.smokeOnly || scenario.expected.length === 0) {
    return { passed: true, failures: [], ms };
  }

  const failures: string[] = [];
  for (const field of scenario.expected) {
    const check = checkField(result, field);
    if (!check.ok) failures.push(check.message);
  }
  return { passed: failures.length === 0, failures, ms };
}

async function main() {
  const scenarios = ALL_SMART_INTAKE_SCENARIOS;
  console.log(`Smart Intake suite: ${scenarios.length} scenarios (useAI=false)\n`);

  let passed = 0;
  let failed = 0;
  const times: number[] = [];
  const failedByCategory: Record<string, number> = {};
  const failedDetails: Array<{ id: string; category: string; failures: string[] }> = [];

  for (const scenario of scenarios) {
    try {
      const r = await runScenario(scenario);
      times.push(r.ms);
      if (r.passed) {
        passed += 1;
        console.log(`✅ ${scenario.id} [${scenario.category}] ${scenario.description} (${r.ms}ms)`);
      } else {
        failed += 1;
        failedByCategory[scenario.category] = (failedByCategory[scenario.category] ?? 0) + 1;
        failedDetails.push({
          id: scenario.id,
          category: scenario.category,
          failures: r.failures,
        });
        console.log(`❌ ${scenario.id} [${scenario.category}] ${scenario.description}`);
        for (const f of r.failures) console.log(`   - ${f}`);
      }
    } catch (err) {
      failed += 1;
      failedByCategory[scenario.category] = (failedByCategory[scenario.category] ?? 0) + 1;
      const message = err instanceof Error ? err.message : String(err);
      failedDetails.push({
        id: scenario.id,
        category: scenario.category,
        failures: [`throw: ${message}`],
      });
      console.log(`💥 ${scenario.id} threw: ${message}`);
    }
  }

  times.sort((a, b) => a - b);
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const p95 = times.length ? times[Math.min(times.length - 1, Math.floor(times.length * 0.95))]! : 0;

  console.log('\n========== SUMMARY ==========');
  console.log(`✅ Passed: ${passed}/${scenarios.length}`);
  console.log(`❌ Failed: ${failed}/${scenarios.length}`);
  console.log(`Success Rate: ${((passed / scenarios.length) * 100).toFixed(1)}%`);
  console.log(`Avg time: ${avg.toFixed(1)}ms | P95: ${p95}ms`);
  console.log('Failed Categories:');
  for (const [cat, n] of Object.entries(failedByCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${cat}: ${n}`);
  }
  if (failedDetails.length) {
    console.log('\nFailed detail:');
    for (const d of failedDetails) {
      console.log(`  #${d.id} [${d.category}]`);
      for (const f of d.failures) console.log(`    ${f}`);
    }
  }

  // Soft gate for Step 5: report always; exit 1 only if success < 70%
  if (passed / scenarios.length < 0.7) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
