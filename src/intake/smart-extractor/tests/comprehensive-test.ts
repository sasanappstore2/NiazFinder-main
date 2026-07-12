/**
 * Comprehensive Smart Intake test runner — Claude Step 5 directive
 * Run: npm run test:smart-intake
 */

import { extractSmartFields } from '../smart-field-extractor';
import {
  ALL_SMART_INTAKE_SCENARIOS,
  type ExpectedField,
  type SmartIntakeScenario,
} from './scenarios';

interface TestResult {
  case: SmartIntakeScenario;
  passed: boolean;
  failures: string[];
  duration: number;
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function checkField(result: unknown, field: ExpectedField): string | null {
  const actual = getPath(result, field.path);

  if ('disambiguationNeeded' in field && field.disambiguationNeeded) {
    const needed = getPath(result, 'location.disambiguationNeeded') === true;
    const alts = getPath(result, 'location.alternatives');
    const altLen = Array.isArray(alts) ? alts.length : 0;
    const min = field.alternativesMin ?? 2;
    if (!(needed && altLen >= min)) {
      return `disambiguation: needed=${String(getPath(result, 'location.disambiguationNeeded'))} alts=${altLen} (want >=${min})`;
    }
    return null;
  }

  if ('includes' in field && field.includes != null) {
    const norm = (s: string) => s.replace(/\u200c/g, '').replace(/\s+/g, '');
    const ok =
      typeof actual === 'string' &&
      (actual.includes(field.includes) || norm(actual).includes(norm(field.includes)));
    if (!ok) {
      return `${field.path}: expected includes "${field.includes}", got ${JSON.stringify(actual)}`;
    }
    return null;
  }

  if ('equals' in field) {
    if (actual !== field.equals) {
      return `${field.path}: expected ${JSON.stringify(field.equals)}, got ${JSON.stringify(actual)}`;
    }
    return null;
  }

  return null;
}

async function testCase(scenario: SmartIntakeScenario): Promise<TestResult> {
  const startTime = Date.now();
  const failures: string[] = [];

  try {
    const result = await extractSmartFields(scenario.needText, '', {
      preferredCity: scenario.preferredCity ?? 'مشهد',
      preferredCitySlug: scenario.preferredCitySlug ?? 'mashhad',
      useAI: false,
      useRules: true,
    });

    if (!scenario.smokeOnly && scenario.expected.length > 0) {
      for (const field of scenario.expected) {
        const fail = checkField(result, field);
        if (fail) failures.push(fail);
      }
    }

    return {
      case: scenario,
      passed: failures.length === 0,
      failures,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      case: scenario,
      passed: false,
      failures: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      duration: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log('🚀 Smart Intake Comprehensive Test Suite');
  console.log(`📊 Running ${ALL_SMART_INTAKE_SCENARIOS.length} test cases (useAI=false)...\n`);

  const results: TestResult[] = [];
  const tagStats = new Map<string, { passed: number; failed: number }>();

  for (const scenario of ALL_SMART_INTAKE_SCENARIOS) {
    const result = await testCase(scenario);
    results.push(result);

    const stat = tagStats.get(scenario.category) || { passed: 0, failed: 0 };
    if (result.passed) stat.passed += 1;
    else stat.failed += 1;
    tagStats.set(scenario.category, stat);

    if (results.length % 50 === 0 || results.length === ALL_SMART_INTAKE_SCENARIOS.length) {
      process.stdout.write(`  Progress: ${results.length}/${ALL_SMART_INTAKE_SCENARIOS.length}\r`);
    }
  }

  console.log('\n\n📋 Test Results:\n');

  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  if (failed.length > 0) {
    console.log('❌ Failed Cases:');
    for (const result of failed) {
      console.log(`\n  [${result.case.id}] ${result.case.needText.slice(0, 80)}`);
      for (const failure of result.failures) {
        console.log(`    ⚠️  ${failure}`);
      }
    }
  }

  console.log('\n📊 Results by Category:');
  for (const [tag, stat] of Array.from(tagStats.entries()).sort()) {
    const total = stat.passed + stat.failed;
    const percentage = Math.round((stat.passed / total) * 100);
    console.log(`  ${tag}: ${stat.passed}/${total} (${percentage}%)`);
  }

  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const times = results.map((r) => r.duration).sort((a, b) => a - b);
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))] ?? 0;

  console.log('\n🎯 Overall Summary:');
  console.log(`  Total: ${passed.length}/${ALL_SMART_INTAKE_SCENARIOS.length} passed`);
  console.log(
    `  Success Rate: ${Math.round((passed.length / ALL_SMART_INTAKE_SCENARIOS.length) * 100)}%`
  );
  console.log(`  Total Time: ${totalTime}ms`);
  console.log(
    `  Avg Time: ${Math.round(totalTime / ALL_SMART_INTAKE_SCENARIOS.length)}ms per test | P95: ${p95}ms`
  );

  // Fail hard below 95% once the corpus is at 1000 cases
  if (passed.length / ALL_SMART_INTAKE_SCENARIOS.length < 0.95) {
    console.log('\n❌ Test suite below 95% threshold');
    process.exit(1);
  }
  if (passed.length < ALL_SMART_INTAKE_SCENARIOS.length) {
    console.log(`\n⚠️  ${failed.length} failing — suite above 95% but not fully green`);
    process.exit(1);
  }
  console.log('\n✅ Suite finished 100% green (threshold >= 95%)');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
