/**
 * Run generated cases against the live /api/post/natural-analyze endpoint and
 * grade extraction quality with a tolerant comparator.
 *
 * Run: npx --yes tsx scripts/testing/si-matrix/run-matrix.ts --cases out/si-matrix/cases.jsonl --out out/si-matrix/run-tag --concurrency 16 [--limit N]
 */
import { promises as fs } from 'fs';
import path from 'path';

interface Expect {
  cityId: string;
  cityName: string;
  hoodIds: string[];
  mentionedLabel: string;
  mentionMode: 'hood' | 'sub' | 'sub+parent';
  categorySlug?: string;
  dealType?: string;
  propertyKind?: string;
  areaMeters?: number;
  rooms?: number;
  rahnAmount?: number;
  monthlyRent?: number;
  budgetMax?: number;
  parking?: boolean;
  elevator?: boolean;
}
interface CaseItem {
  id: string;
  group: string;
  text: string;
  expect: Expect;
}

const API = 'http://localhost:3006/api/post/natural-analyze';

/** Hood ids per catalog city (cached) — a mentioned label that is itself a
 *  managed hood is a legitimate resolution target alongside area parents. */
const cityHoodIdsCache = new Map<string, Set<string>>();
async function cityHoodIds(cityId: string): Promise<Set<string>> {
  const cached = cityHoodIdsCache.get(cityId);
  if (cached) return cached;
  const ids = new Set<string>();
  try {
    const { readFile } = await import('fs/promises');
    const raw = await readFile(`src/data/neighborhoods/catalog/${cityId}.json`, 'utf8');
    const data = JSON.parse(raw) as { neighborhoods?: Array<{ id: string; name: string }> };
    for (const n of data.neighborhoods ?? []) {
      ids.add(n.id);
      ids.add(n.name);
    }
  } catch {
    /* city catalog missing — empty set */
  }
  cityHoodIdsCache.set(cityId, ids);
  return ids;
}

const HOOD_ALIASES: Record<string, string> = {
  'امام-زاده-قاسم-نیاوران': 'امام زاده قاسم (نیاوران)',
  'جماران-نیاوران': 'جماران (نیاوران)',
};
function normalizeId(id: string): string {
  return HOOD_ALIASES[id] ?? id;
}
/** Catalog ids use dashes («دهقان-ویلا») while text labels use spaces — compare freely. */
function looseHoodKey(value: string): string {
  return normalizeId(value).replace(/[-_]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

interface AnalyzeResponse {
  draftPatch?: { entities?: Record<string, unknown> };
  fields?: Array<{ key: string; value: unknown; requiresConfirmation?: boolean }>;
  provisionalCategory?: { slug: string };
  categoryCandidates?: Array<{ slug: string }>;
  locationCandidates?: Array<{ slug: string; label: string }>;
  si?: { status: string };
  latencyMs?: number;
}

async function analyze(text: string, cityName: string, citySlug: string): Promise<AnalyzeResponse> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceText: text, cityName, citySlug }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 160)}`);
  }
  return (await res.json()) as AnalyzeResponse;
}

interface Grade {
  field: string;
  problem: string;
  severity: 'wrong-fill' | 'missing' | 'ambiguous-ok';
}

function moneyEqual(got: unknown, expected: number | undefined): boolean {
  if (expected == null) return true;
  if (typeof got !== 'number' || !Number.isFinite(got)) return false;
  const diff = Math.abs(got - expected);
  return diff <= Math.max(1_000, expected * 0.001);
}

function gradeCase(c: CaseItem, r: AnalyzeResponse, selfHoodIds: Set<string>): Grade[] {
  const grades: Grade[] = [];
  const e = r.draftPatch?.entities ?? {};
  const a = r.draftPatch?.answers ?? {};
  const str = (k: string): string | undefined => (typeof e[k] === 'string' ? (e[k] as string) : undefined);
  const numv = (k: string): number | undefined => (typeof e[k] === 'number' ? (e[k] as number) : undefined);
  const field = (key: string): unknown =>
    r.fields?.find((f) => f.key === key)?.value;
  const fieldStr = (key: string): string | undefined => {
    const v = field(key);
    return typeof v === 'string' ? v : undefined;
  };

  // --- city ---
  const bareCityId = c.expect.cityId.replace(/-city$/, '');
  const cityOk =
    str('city') === c.expect.cityName ||
    str('citySlug') === c.expect.cityId ||
    str('citySlug') === bareCityId ||
    (str('city') ?? '').includes(c.expect.cityName);
  if (!cityOk && c.expect.cityKnown) {
    grades.push({
      field: c.expect.cityInText ? 'city' : 'city-from-context',
      problem: `got city=${str('city') ?? '—'} expected ${c.expect.cityName}`,
      severity: 'wrong-fill',
    });
  }

  // --- neighborhood: auto-resolve → one of hoodIds; else candidates intersect ---
  const hoodIds = c.expect.hoodIds.map(normalizeId);
  const gotHood = str('neighborhood');
  const gotHoodSlug = str('neighborhoodSlug');
  const labelSelf = normalizeId(c.expect.mentionedLabel);
  const gotSelfHood =
    gotHoodSlug != null &&
    c.expect.mentionMode !== 'sub+parent' &&
    looseHoodKey(gotHoodSlug) === looseHoodKey(labelSelf) &&
    (selfHoodIds.has(labelSelf) ||
      Array.from(selfHoodIds).some((id) => looseHoodKey(id) === looseHoodKey(labelSelf)));
  const autoHit =
    (gotHoodSlug != null && hoodIds.includes(gotHoodSlug)) ||
    (gotHood != null && hoodIds.includes(gotHood)) ||
    gotSelfHood;
  const candidates = (r.locationCandidates ?? []).map((x) => x.slug);
  const candidateHit = hoodIds.some((id) => candidates.includes(id) || candidates.includes(normalizeId(id)));
  if (!autoHit && !candidateHit) {
    grades.push({
      field: 'neighborhood',
      problem: `mode=${c.expect.mentionMode} label="${c.expect.mentionedLabel}" got=${gotHood ?? '—'}/${gotHoodSlug ?? '—'} cands=[${candidates.slice(0, 4).join('،')}]`,
      severity: gotHood || candidates.length ? 'wrong-fill' : 'missing',
    });
  } else if (!autoHit && candidateHit) {
    grades.push({ field: 'neighborhood', problem: 'resolved via candidates only', severity: 'ambiguous-ok' });
  }

  // --- category ---
  if (c.expect.categorySlug) {
    const cat =
      r.provisionalCategory?.slug ??
      fieldStr('categorySlug') ??
      str('categorySlug') ??
      r.categoryCandidates?.[0]?.slug ??
      '';
    if (!cat.startsWith(c.expect.categorySlug.split('-')[0]!)) {
      grades.push({ field: 'category', problem: `got ${cat} expected ${c.expect.categorySlug}`, severity: 'wrong-fill' });
    }
  }

  // --- deal type (answers.dealType is the canonical home; rent deals only) ---
  if (c.expect.dealType && c.expect.dealType.startsWith('rent')) {
    const gotDeal =
      (typeof a.dealType === 'string' ? a.dealType : undefined) ??
      fieldStr('dealType') ??
      str('dealType') ??
      '';
    if (!/rahn|rent|deposit/i.test(gotDeal)) {
      grades.push({ field: 'dealType', problem: `got ${gotDeal || '—'} expected rahn/rent family`, severity: 'wrong-fill' });
    }
  }

  // --- money ---
  const rahn = numv('rahnAmount') ?? numv('deposit');
  if (c.expect.rahnAmount != null && !moneyEqual(rahn, c.expect.rahnAmount)) {
    grades.push({ field: 'rahnAmount', problem: `got ${rahn ?? '—'} expected ${c.expect.rahnAmount}`, severity: rahn == null ? 'missing' : 'wrong-fill' });
  }
  if (c.expect.monthlyRent != null && !moneyEqual(numv('monthlyRent'), c.expect.monthlyRent)) {
    const gotRent = numv('monthlyRent');
    grades.push({ field: 'monthlyRent', problem: `got ${gotRent ?? '—'} expected ${c.expect.monthlyRent}`, severity: gotRent == null ? 'missing' : 'wrong-fill' });
  }
  if (c.expect.budgetMax != null) {
    const got = numv('budgetMax') ?? numv('totalPrice') ?? numv('price');
    if (!moneyEqual(got, c.expect.budgetMax)) {
      grades.push({ field: 'budgetMax', problem: `got ${got ?? '—'} expected ${c.expect.budgetMax}`, severity: got == null ? 'missing' : 'wrong-fill' });
    }
  }

  // --- area ---
  if (c.expect.areaMeters != null) {
    const gotArea = numv('area');
    if (gotArea == null || Math.abs(gotArea - c.expect.areaMeters) > 1) {
      grades.push({ field: 'area', problem: `got ${gotArea ?? '—'} expected ${c.expect.areaMeters}`, severity: gotArea == null ? 'missing' : 'wrong-fill' });
    }
  }

  return grades;
}

async function main() {
  const arg = (name: string, fallback: string): string => {
    const argv = process.argv;
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && argv[idx + 1] != null) return argv[idx + 1]!;
    return fallback;
  };
  const casesPath = arg('cases', 'out/si-matrix/cases.jsonl');
  const outDir = arg('out', 'out/si-matrix/run');
  const concurrency = Number(arg('concurrency', '16'));
  const limit = Number(arg('limit', '0'));

  const raw = await fs.readFile(casesPath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const cases: CaseItem[] = (limit > 0 ? lines.slice(0, limit) : lines).map((l) => JSON.parse(l));
  await fs.mkdir(outDir, { recursive: true });

  const results: Array<{ c: CaseItem; r: AnalyzeResponse | null; error?: string; grades: Grade[] }> = [];
  let cursor = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (cursor < cases.length) {
      const idx = cursor++;
      const c = cases[idx]!;
      let r: AnalyzeResponse | null = null;
      let error: string | undefined;
      try {
        r = await analyze(c.text, c.expect.cityName, c.expect.cityId);
      } catch (e) {
        error = String(e instanceof Error ? e.message : e).slice(0, 200);
      }
      const selfIds = await cityHoodIds(c.expect.cityId);
      const grades = r ? gradeCase(c, r, selfIds) : [{ field: 'http', problem: error ?? 'no response', severity: 'missing' as const }];
      results.push({ c, r, error, grades });
      done += 1;
      if (done % 500 === 0) console.log(`progress: ${done}/${cases.length}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // summary
  const failures = results.filter((x) => x.grades.some((g) => g.severity !== 'ambiguous-ok'));
  const ambiguousOk = results.filter((x) => x.grades.some((g) => g.severity === 'ambiguous-ok') && !x.grades.some((g) => g.severity !== 'ambiguous-ok'));
  const pass = results.length - failures.length - ambiguousOk.length;
  const byField: Record<string, number> = {};
  const byGroup: Record<string, { total: number; fail: number }> = {};
  const byMode: Record<string, { total: number; fail: number }> = {};
  const wrongFillCount = failures.reduce((s, x) => s + x.grades.filter((g) => g.severity === 'wrong-fill').length, 0);
  for (const x of results) {
    const g = byGroup[x.c.group] ?? { total: 0, fail: 0 };
    g.total += 1;
    if (x.grades.some((gr) => gr.severity !== 'ambiguous-ok')) g.fail += 1;
    byGroup[x.c.group] = g;
    const m = byMode[x.c.expect.mentionMode] ?? { total: 0, fail: 0 };
    m.total += 1;
    if (x.grades.some((gr) => gr.severity !== 'ambiguous-ok')) m.fail += 1;
    byMode[x.c.expect.mentionMode] = m;
    for (const gr of x.grades) if (gr.severity !== 'ambiguous-ok') byField[gr.field] = (byField[gr.field] ?? 0) + 1;
  }

  const fd = await fs.open(path.join(outDir, 'failures.jsonl'), 'w');
  for (const x of failures) {
    await fd.write(
      JSON.stringify({
        id: x.c.id,
        group: x.c.group,
        text: x.c.text,
        expect: x.c.expect,
        got: x.r?.draftPatch?.entities ?? null,
        locationCandidates: x.r?.locationCandidates ?? null,
        grades: x.grades,
        error: x.error,
      }) + '\n'
    );
  }
  await fd.close();

  const siReady = results.filter((x) => x.r?.si?.status === 'ready').length;
  const summary = {
    total: results.length,
    pass,
    passWithCandidates: ambiguousOk.length,
    fail: failures.length,
    wrongFillCount,
    passRate: Number(((pass / results.length) * 100).toFixed(2)),
    resolvedOrCandidatesRate: Number((((pass + ambiguousOk.length) / results.length) * 100).toFixed(2)),
    byField,
    byGroup,
    byMode,
    siReady,
    httpErrors: results.filter((x) => x.error).length,
  };
  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error('MATRIX FAILED:', e);
  process.exit(1);
});
