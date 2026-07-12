/**
 * Validate Mashhad marketplace 100 JSONL against extractSmartFields
 * Run: npx tsx src/intake/smart-extractor/tests/marketplace-validation.test.ts
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { extractSmartFields } from '../smart-field-extractor';

type Row = {
  id: string;
  title: string;
  description: string;
  needText: string;
  preferredCity?: string;
  preferredCitySlug?: string;
  expected_category: string;
  expected_neighborhood: string;
  expected_transaction: string | null;
  expected_rooms: number | null;
  expected_area: number | null;
  expected_deposit?: number | null;
  expected_rent?: number | null;
  tags?: string[];
};

function norm(s: string): string {
  return s.replace(/\u200c/g, '').replace(/\s+/g, '');
}

function loadRows(): Row[] {
  const file = path.join(
    process.cwd(),
    'src/intake/smart-extractor/data/mashhad-marketplace-100.jsonl'
  );
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row);
}

async function main() {
  const rows = loadRows();
  console.log(`Marketplace validation: ${rows.length} cases\n`);

  let checked = 0;
  let fieldHits = 0;
  let fieldTotal = 0;
  let throws = 0;
  const disambigFlags: string[] = [];
  const fails: string[] = [];

  for (const row of rows) {
    try {
      const result = await extractSmartFields(row.needText || `${row.title}. ${row.description}`, '', {
        preferredCity: row.preferredCity || 'مشهد',
        preferredCitySlug: row.preferredCitySlug || 'mashhad',
        useAI: false,
        useRules: true,
      });

      // Soft: non-estate categories only require no-throw
      if (row.expected_category !== 'real-estate' && row.expected_category !== 'commercial') {
        checked += 1;
        continue;
      }

      const checks: Array<[string, boolean]> = [];
      if (row.expected_transaction) {
        checks.push([
          'transaction',
          result.transaction.type === row.expected_transaction,
        ]);
      }
      if (row.expected_rooms != null) {
        checks.push(['rooms', result.property.rooms === row.expected_rooms]);
      }
      if (row.expected_area != null) {
        checks.push(['area', result.property.area === row.expected_area]);
      }
      if (row.expected_deposit != null) {
        checks.push(['deposit', result.budget.depositAmount === row.expected_deposit]);
      }
      if (row.expected_rent != null) {
        checks.push(['rent', result.budget.rentAmount === row.expected_rent]);
      }
      if (row.expected_neighborhood) {
        const got = result.location.neighborhood || '';
        checks.push([
          'neighborhood',
          norm(got).includes(norm(row.expected_neighborhood)) ||
            norm(row.expected_neighborhood).includes(norm(got)),
        ]);
      }

      for (const [name, ok] of checks) {
        fieldTotal += 1;
        if (ok) fieldHits += 1;
        else fails.push(`${row.id} ${name}: expected from case, got type=${result.transaction.type} rooms=${result.property.rooms} area=${result.property.area} hood=${result.location.neighborhood} dep=${result.budget.depositAmount}`);
      }

      if (
        result.location.disambiguationNeeded ||
        (result.location.alternatives?.length ?? 0) > 1
      ) {
        if (/فردوسی|خیام|بنفشه/.test(row.needText + row.expected_neighborhood)) {
          disambigFlags.push(
            `${row.id} ${row.expected_neighborhood} alts=${result.location.alternatives?.length ?? 0}`
          );
        }
      }

      checked += 1;
    } catch (err) {
      throws += 1;
      fails.push(`${row.id} throw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const accuracy = fieldTotal ? (fieldHits / fieldTotal) * 100 : 100;
  console.log(`Checked rows: ${checked}/${rows.length}`);
  console.log(`Field accuracy: ${fieldHits}/${fieldTotal} (${accuracy.toFixed(1)}%)`);
  console.log(`Throws: ${throws}`);
  console.log(`Disambiguation flags (فردوسی/خیام/بنفشه): ${disambigFlags.length}`);
  for (const d of disambigFlags.slice(0, 15)) console.log(`  • ${d}`);
  if (fails.length) {
    console.log(`\nSample failures (${Math.min(12, fails.length)}/${fails.length}):`);
    for (const f of fails.slice(0, 12)) console.log(`  - ${f}`);
  }

  if (throws > 0 || accuracy < 85) {
    console.log('\n❌ marketplace-validation below target (85% field accuracy, 0 throws)');
    process.exit(1);
  }
  console.log('\n✅ marketplace-validation PASS (>=85% field accuracy)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
