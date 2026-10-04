#!/usr/bin/env npx tsx
/**
 * Deep-test evaluator for one slice of the smart-intake corpus (1000 ad texts).
 *
 * Runs each scenario clean plus N seeded typo variants with the fuzzy corrector
 * ON, and (mode=both) the same variants with it OFF, then prints a JSON summary
 * after the ===DEEP_JSON=== marker.
 *
 * Usage:
 *   npx tsx scripts/deep-test/eval-slice.ts --from 1 --to 100 --variants 3 --mode both --json
 */
import { ALL_SMART_INTAKE_SCENARIOS } from '../../src/intake/smart-extractor/tests/scenarios';
import {
  evaluateScenario,
  hashString,
  injectTypo,
  mulberry32,
} from '../../src/intake/smart-extractor/tests/typo-sim';

interface SliceFailure {
  id: string;
  variant: number;
  word: string;
  failures: string[];
}

interface CleanFailure {
  id: string;
  failures: string[];
}

interface SliceReport {
  from: number;
  to: number;
  variants: number;
  clean: { ok: number; total: number };
  typoOn: { ok: number; total: number };
  typoOff: { ok: number; total: number };
  latencyMs: { avg: number; p95: number };
  failuresOn: SliceFailure[];
  cleanFailures: CleanFailure[];
}

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1]! : fallback;
}

function p95(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
}

async function main(): Promise<void> {
  const from = Math.max(1, parseInt(arg('from', '1'), 10));
  const to = Math.min(ALL_SMART_INTAKE_SCENARIOS.length, parseInt(arg('to', '1000'), 10));
  const variants = parseInt(arg('variants', '3'), 10);
  const mode = arg('mode', 'both');
  const wantJson = process.argv.includes('--json');
  const failuresCap = parseInt(arg('failures-cap', '40'), 10);

  const slice = ALL_SMART_INTAKE_SCENARIOS.slice(from - 1, to);
  const report: SliceReport = {
    from,
    to,
    variants,
    clean: { ok: 0, total: slice.length },
    typoOn: { ok: 0, total: 0 },
    typoOff: { ok: 0, total: 0 },
    latencyMs: { avg: 0, p95: 0 },
    failuresOn: [],
    cleanFailures: [],
  };
  const latencies: number[] = [];

  for (const scenario of slice) {
    const clean = await evaluateScenario(scenario, scenario.needText);
    latencies.push(clean.ms);
    if (clean.ok) report.clean.ok++;
    else if (report.cleanFailures.length < failuresCap) {
      report.cleanFailures.push({ id: scenario.id, failures: clean.failures.slice(0, 4) });
    }

    for (let v = 0; v < variants; v++) {
      const rng = mulberry32(hashString(`deep:${scenario.id}:${v}`));
      const typo = injectTypo(scenario.needText, rng);
      if (!typo) continue;

      if (mode === 'on' || mode === 'both') {
        report.typoOn.total++;
        const on = await evaluateScenario(scenario, typo.text);
        latencies.push(on.ms);
        if (on.ok) report.typoOn.ok++;
        else if (report.failuresOn.length < failuresCap) {
          report.failuresOn.push({
            id: scenario.id,
            variant: v,
            word: typo.word,
            failures: on.failures.slice(0, 4),
          });
        }
      }

      if (mode === 'off' || mode === 'both') {
        process.env.INTAKE_FUZZY_CORRECTOR = 'false';
        report.typoOff.total++;
        const off = await evaluateScenario(scenario, typo.text);
        if (off.ok) report.typoOff.ok++;
        process.env.INTAKE_FUZZY_CORRECTOR = '';
      }
    }
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  report.latencyMs = {
    avg: sorted.length ? Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length) : 0,
    p95: p95(sorted),
  };

  if (wantJson) {
    console.log('===DEEP_JSON===');
    console.log(JSON.stringify(report));
  } else {
    const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`);
    console.log(`slice ${from}-${to}: clean ${report.clean.ok}/${report.clean.total} | ON ${report.typoOn.ok}/${report.typoOn.total} (${pct(report.typoOn.ok, report.typoOn.total)}) | OFF ${report.typoOff.ok}/${report.typoOff.total} (${pct(report.typoOff.ok, report.typoOff.total)}) | avg ${report.latencyMs.avg}ms p95 ${report.latencyMs.p95}ms | failures=${report.failuresOn.length}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
