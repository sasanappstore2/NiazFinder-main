/**
 * Golden eval for estate cross-leaf collision matrix (legacy + collision table).
 * Uses legacy rules only so the suite stays fast without scanning ~1M pack rules.
 *
 * Run: npm run test:estate-collision-golden
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface GoldenCase {
  id: string;
  text: string;
  expectSlug: string;
}

async function main(): Promise<void> {
  const { matchCategoryFromLegacyRules } = await import('@/intake/rules/registry-legacy');

  const cases = JSON.parse(
    readFileSync(join(process.cwd(), 'src/intake/rules/fixtures/estate-collision-golden.json'), 'utf8')
  ) as GoldenCase[];

  let pass = 0;
  const failures: string[] = [];

  for (const c of cases) {
    const hit = matchCategoryFromLegacyRules(c.text);
    const got = hit?.subcategorySlug ?? hit?.categorySlug ?? null;
    if (got === c.expectSlug) {
      pass += 1;
      continue;
    }
    failures.push(`${c.id}: got=${got ?? 'null'} expected=${c.expectSlug}`);
  }

  console.log(
    JSON.stringify(
      {
        total: cases.length,
        pass,
        fail: failures.length,
        failures: failures.slice(0, 20),
      },
      null,
      2
    )
  );

  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
