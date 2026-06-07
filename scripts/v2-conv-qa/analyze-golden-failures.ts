#!/usr/bin/env npx tsx
/**
 * Analyze golden replay failures by type (auditor vs metadata).
 * Usage: npx tsx scripts/v2-conv-qa/analyze-golden-failures.ts
 */
import { runGoldenReplay } from '@/lib/intake-v2/fixtures/run-v2-conv-golden';

async function main() {
  const withMeta = await runGoldenReplay({ assertMetadata: true });
  const auditorOnly = await runGoldenReplay({ assertMetadata: false });

  console.log('With metadata:', withMeta.passed, 'pass,', withMeta.failed.length, 'fail');
  console.log('Auditor only:', auditorOnly.passed, 'pass,', auditorOnly.failed.length, 'fail');
  console.log('Metadata-only failures:', withMeta.failed.length - auditorOnly.failed.length);

  const rules: Record<string, number> = {};
  for (const f of auditorOnly.failed) {
    const m = f.match(/: ([a-z_0-9]+)/);
    const k = m?.[1] ?? 'other';
    rules[k] = (rules[k] ?? 0) + 1;
  }
  console.log('\nTop auditor failure types:');
  for (const [k, n] of Object.entries(rules).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${n}\t${k}`);
  }

  console.log('\nSample auditor failures:');
  for (const x of auditorOnly.failed.slice(0, 15)) {
    console.log(' -', x);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
