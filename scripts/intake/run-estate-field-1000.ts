/**
 * Score city / neighborhood / area / rooms / budget on the estate-1000 corpus.
 *
 * Run: npm run test:estate-field-1000
 */
import '../stress/intake-marathon/stub-server-only';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const CORPUS_A = join(ROOT, 'tmp/estate-category-1000/corpus.jsonl');
const CORPUS_B = join(ROOT, 'fixtures/estate-category-1000.jsonl');
const OUT_DIR = join(ROOT, 'tmp/estate-field-1000');
const ARTIFACT_DIR = '/opt/cursor/artifacts';

function parseArgs(argv: string[]) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
  return {
    generate: argv.includes('--generate'),
    limit: limitArg ? Number(limitArg) : undefined,
  };
}

function loadCorpus(): EstateParagraphCase[] {
  const path = existsSync(CORPUS_A) ? CORPUS_A : CORPUS_B;
  if (!existsSync(path)) {
    throw new Error('Missing corpus. Run: npm run generate:estate-category-1000');
  }
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EstateParagraphCase);
}

function norm(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function includesLoose(got: string, expect: string): boolean {
  const a = norm(got);
  const b = norm(expect);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function numClose(got: unknown, expect: number | undefined, tol = 0.15): boolean {
  if (expect == null || !Number.isFinite(expect)) return true;
  const n = typeof got === 'number' ? got : Number(got);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n - expect) / Math.max(expect, 1) <= tol;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  if (args.generate || (!existsSync(CORPUS_A) && !existsSync(CORPUS_B))) {
    const { spawnSync } = await import('node:child_process');
    const gen = spawnSync('npx', ['--yes', 'tsx', 'scripts/intake/generate-estate-category-1000.ts'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    });
    if (gen.status !== 0) {
      console.error(gen.stderr);
      throw new Error('corpus generate failed');
    }
  }

  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';

  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  const corpus = loadCorpus().slice(0, args.limit ?? 1000);
  const scores = {
    city: { n: 0, pass: 0 },
    neighborhood: { n: 0, pass: 0 },
    area: { n: 0, pass: 0 },
    rooms: { n: 0, pass: 0 },
    budget: { n: 0, pass: 0 },
  };
  const misses: Array<Record<string, unknown>> = [];

  let i = 0;
  for (const cse of corpus) {
    i += 1;
    const result = await runHybridIntakePipeline({ text: cse.text });
    const city = String(result.fields.city?.value ?? result.draft.entities.city ?? '');
    const hood = String(
      result.fields.neighborhood?.value ?? result.draft.entities.neighborhood ?? ''
    );
    const area = result.fields.area?.value ?? result.draft.entities.area;
    const rooms = result.fields.rooms?.value ?? result.draft.entities.rooms;
    const rahn = result.fields.rahnAmount?.value;
    const rent = result.fields.monthlyRent?.value;
    const budgetMax = result.fields.budgetMax?.value ?? result.draft.entities.budgetMax;

    if (cse.oracle.city) {
      scores.city.n += 1;
      if (includesLoose(city, cse.oracle.city)) scores.city.pass += 1;
      else misses.push({ id: cse.id, field: 'city', expect: cse.oracle.city, got: city });
    }
    if (cse.oracle.neighborhood) {
      scores.neighborhood.n += 1;
      if (includesLoose(hood, cse.oracle.neighborhood)) scores.neighborhood.pass += 1;
      else misses.push({ id: cse.id, field: 'neighborhood', expect: cse.oracle.neighborhood, got: hood });
    }
    const areaExpect = cse.oracle.area?.exact;
    const textHasArea = areaExpect != null && (cse.text.includes('متر') || cse.text.includes(String(areaExpect)));
    if (areaExpect != null && textHasArea) {
      scores.area.n += 1;
      if (numClose(area, areaExpect, 0.2)) scores.area.pass += 1;
      else misses.push({ id: cse.id, field: 'area', expect: areaExpect, got: area });
    }
    const textHasRooms = cse.oracle.rooms != null && /خواب|اتاق/.test(cse.text);
    if (cse.oracle.rooms != null && textHasRooms) {
      scores.rooms.n += 1;
      if (Number(rooms) === cse.oracle.rooms) scores.rooms.pass += 1;
      else misses.push({ id: cse.id, field: 'rooms', expect: cse.oracle.rooms, got: rooms });
    }
    const budgetOracle = cse.oracle.budget;
    const textHasMoney = /میلیون|میلیارد|تومان|رهن|اجاره|بودجه/.test(cse.text);
    if (budgetOracle && textHasMoney && (budgetOracle.max || budgetOracle.rahn || budgetOracle.rent)) {
      scores.budget.n += 1;
      const ok =
        (budgetOracle.rahn != null && numClose(rahn, budgetOracle.rahn, 0.25)) ||
        (budgetOracle.rent != null && numClose(rent, budgetOracle.rent, 0.25)) ||
        (budgetOracle.max != null && numClose(budgetMax, budgetOracle.max, 0.35));
      if (ok) scores.budget.pass += 1;
      else {
        misses.push({
          id: cse.id,
          field: 'budget',
          expect: budgetOracle,
          got: { rahn, rent, budgetMax },
        });
      }
    }

    if (i % 200 === 0) console.log(`progress ${i}/${corpus.length}`);
  }

  const pct = (s: { n: number; pass: number }) =>
    s.n ? Math.round((1000 * s.pass) / s.n) / 10 : 100;
  const report = {
    at: new Date().toISOString(),
    total: corpus.length,
    scores: Object.fromEntries(
      Object.entries(scores).map(([k, s]) => [k, { ...s, pct: pct(s) }])
    ),
    missCount: misses.length,
    sampleMisses: misses.slice(0, 40),
  };

  writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'estate_field_1000_summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.scores, null, 2));
  console.log('test:estate-field-1000 OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
