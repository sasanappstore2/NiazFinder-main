/**
 * End-to-end accuracy of POST /api/post/natural-analyze against the
 * hand-authored Persian benchmark.
 *
 * Exercises the full production path on each case: catalog city/neighborhood
 * resolution, rules-first deterministic extraction, and the local Laya worker
 * (base or adapter) for the decisions the rules leave open. Expects the Next.js
 * dev server on :3000 and the Laya worker on :8101.
 *
 * Run:
 *   npx tsx scripts/health/run-post-natural-e2e.ts --label adapter
 *
 * The route rate-limits to 24 requests/minute per IP, so the runner sends
 * small waves with pauses and retries 429 responses.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const WAVE_SIZE = 20;
const WAVE_PAUSE_MS = 61_000;

type ExpectedFields = {
  category_candidate: string;
  property_kind: string;
  transaction_type: string;
};

type BenchmarkRow = {
  id: string;
  text: string;
  expectedCity: string;
  expectedNeighborhood: string | null;
  expected: ExpectedFields;
};

type Field = {
  key: string;
  value: unknown;
  source?: string;
  confidence?: number;
  requiresConfirmation?: boolean;
};

type AnalyzeResponse = {
  fields?: Field[];
  provisionalCategory?: { slug: string; confidence: number; requiresConfirmation: boolean };
  categoryCandidates?: Array<{ slug: string; label: string }>;
  draftPatch?: { entities?: Record<string, unknown> };
  laya?: { status?: string; latencyMs?: number };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeDealType(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim().toLowerCase();
  const map: Record<string, string> = {
    buy: 'buy',
    purchase: 'buy',
    sell: 'sell',
    sale: 'sell',
    rent: 'rent_monthly',
    monthly_rent: 'rent_monthly',
    rent_monthly: 'rent_monthly',
    full_deposit: 'rent_rahn_full',
    mortgage: 'rent_rahn_full',
    rent_rahn_full: 'rent_rahn_full',
    deposit_and_rent: 'rent_rahn_ejare',
    rent_rahn_ejare: 'rent_rahn_ejare',
    daily_rent: 'rent_short_term',
    nightly: 'rent_short_term',
    rent_short_term: 'rent_short_term',
  };
  return map[v] ?? v;
}

function findField(response: AnalyzeResponse, key: string): Field | undefined {
  return response.fields?.find((field) => field.key === key);
}

async function postAnalyze(text: string): Promise<AnalyzeResponse> {
  let attempt = 0;
  for (;;) {
    const response = await fetch(`${BASE}/api/post/natural-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText: text }),
    });
    if (response.status === 429 && attempt < 3) {
      attempt += 1;
      console.log('  rate-limited; waiting a window...');
      await sleep(WAVE_PAUSE_MS);
      continue;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`analyze failed: ${response.status} ${body.slice(0, 300)}`);
    }
    return (await response.json()) as AnalyzeResponse;
  }
}

type Observation = {
  id: string;
  text: string;
  layaStatus: string | null;
  city: { expected: string; observed: string | null; source: string | null; match: boolean };
  neighborhood: {
    expected: string | null;
    observed: string | null;
    source: string | null;
    match: boolean | null;
  };
  category: {
    expected: string;
    observed: string | null;
    match: boolean;
    asked: boolean;
    confidence: number | null;
    candidateCount: number;
  };
  propertyKind: {
    expected: string;
    observed: string | null;
    source: string | null;
    match: boolean;
  };
  dealType: {
    expected: string;
    observed: string | null;
    source: string | null;
    match: boolean;
  };
};

function tally(rows: Observation[]): Record<string, { checked: number; correct: number }> {
  const out: Record<string, { checked: number; correct: number }> = {};
  for (const key of ['city', 'neighborhood', 'category', 'propertyKind', 'dealType']) {
    out[key] = { checked: 0, correct: 0 };
  }
  for (const row of rows) {
    if (row.city.match !== undefined) {
      out.city.checked += 1;
      out.city.correct += row.city.match ? 1 : 0;
    }
    if (row.neighborhood.match !== null) {
      out.neighborhood.checked += 1;
      out.neighborhood.correct += row.neighborhood.match ? 1 : 0;
    }
    out.category.checked += 1;
    out.category.correct += row.category.match ? 1 : 0;
    out.propertyKind.checked += 1;
    out.propertyKind.correct += row.propertyKind.match ? 1 : 0;
    out.dealType.checked += 1;
    out.dealType.correct += row.dealType.match ? 1 : 0;
  }
  return out;
}

async function main(): Promise<void> {
  const label = argValue('--label') ?? 'default';
  const benchmarkPath = resolve(
    argValue('--benchmark') ?? 'data/laya-experiments/laya-fa-handmade-benchmark-v1.json'
  );
  const rows = JSON.parse(readFileSync(benchmarkPath, 'utf8')) as BenchmarkRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('benchmark is empty');
  }

  const health = await fetch(`${BASE}/api/post/natural-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceText: 'آپارتمان در تهران' }),
  }).catch(() => null);
  if (!health || !health.ok) {
    console.error(`dev server not reachable at ${BASE} (status=${health?.status ?? 'n/a'})`);
    process.exit(1);
  }

  const observations: Observation[] = [];
  const failures: Array<Record<string, unknown>> = [];
  const layaStatuses: Record<string, number> = {};
  let waveCount = 0;

  for (const [index, row] of rows.entries()) {
    if (index > 0 && index % WAVE_SIZE === 0) {
      waveCount += 1;
      console.log(`wave ${waveCount}: pausing ${WAVE_PAUSE_MS / 1000}s for the rate window...`);
      await sleep(WAVE_PAUSE_MS);
    }
    const response = await postAnalyze(row.text);
    const layaStatus = response.laya?.status ?? null;
    if (layaStatus) layaStatuses[layaStatus] = (layaStatuses[layaStatus] ?? 0) + 1;

    const cityField = findField(response, 'city');
    const observedCity =
      (typeof cityField?.value === 'string' ? cityField.value : null) ??
      (typeof response.draftPatch?.entities?.city === 'string'
        ? (response.draftPatch.entities.city as string)
        : null);
    const neighborhoodField = findField(response, 'neighborhood');
    const observedNeighborhood =
      typeof neighborhoodField?.value === 'string' ? neighborhoodField.value : null;

    const categorySlugField = findField(response, 'categorySlug');
    const candidateCount = response.categoryCandidates?.length ?? 0;
    const observedCategory =
      response.provisionalCategory?.slug ??
      (typeof categorySlugField?.value === 'string' ? categorySlugField.value : null) ??
      (typeof response.draftPatch?.entities?.subcategorySlug === 'string'
        ? (response.draftPatch.entities.subcategorySlug as string)
        : null) ??
      // When the rules narrow to exactly one leaf, that pick is the pipeline's
      // effective category even though no provisional category is emitted.
      (candidateCount === 1 ? response.categoryCandidates?.[0]?.slug : null);

    const propertyField = findField(response, 'propertyKind');
    const observedProperty =
      typeof propertyField?.value === 'string' ? propertyField.value : null;
    const dealField = findField(response, 'dealType');
    const observedDeal = normalizeDealType(dealField?.value);

    const expectedProperty =
      row.expected.property_kind === 'unknown' ? null : row.expected.property_kind;
    const expectedDeal =
      row.expected.transaction_type === 'unknown' ? null : row.expected.transaction_type;

    const observation: Observation = {
      id: row.id,
      text: row.text,
      layaStatus,
      city: {
        expected: row.expectedCity,
        observed: observedCity,
        source: cityField?.source ?? null,
        match: observedCity === row.expectedCity,
      },
      neighborhood: {
        expected: row.expectedNeighborhood,
        observed: observedNeighborhood,
        source: neighborhoodField?.source ?? null,
        match:
          row.expectedNeighborhood === null
            ? null
            : observedNeighborhood === row.expectedNeighborhood,
      },
      category: {
        expected: row.expected.category_candidate,
        observed: observedCategory,
        match: observedCategory === row.expected.category_candidate,
        asked: layaStatus === 'ready',
        confidence: response.provisionalCategory?.confidence ?? null,
        candidateCount,
      },
      propertyKind: {
        expected: row.expected.property_kind,
        observed: observedProperty,
        source: propertyField?.source ?? null,
        match: observedProperty === expectedProperty,
      },
      dealType: {
        expected: row.expected.transaction_type,
        observed: observedDeal,
        source: dealField?.source ?? null,
        match: observedDeal === expectedDeal,
      },
    };
    observations.push(observation);

    for (const fieldKey of ['city', 'neighborhood', 'category', 'propertyKind', 'dealType'] as const) {
      const item = observation[fieldKey];
      if (item.match === null || item.match === undefined) continue;
      if (!item.match) {
        failures.push({ id: row.id, field: fieldKey, ...item });
      }
    }
  }

  const summary = tally(observations);
  const rates = Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [
      key,
      {
        ...value,
        accuracy: value.checked ? value.correct / value.checked : null,
      },
    ])
  );

  const report = {
    label,
    benchmark: benchmarkPath,
    baseUrl: BASE,
    cases: rows.length,
    layaStatuses,
    summary: rates,
    failures,
    observations,
  };
  const outPath = resolve(
    argValue('--out') ??
      `data/laya-experiments/post-natural-e2e-${label}-${Date.now()}.json`
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\n=== post/natural-analyze e2e (${label}) — ${rows.length} cases ===`);
  console.log('laya status:', JSON.stringify(layaStatuses));
  for (const [key, value] of Object.entries(rates)) {
    const pct = value.accuracy === null ? 'n/a' : `${(value.accuracy * 100).toFixed(1)}%`;
    console.log(`  ${key.padEnd(14)} ${value.correct}/${value.checked}  ${pct}`);
  }
  if (failures.length) {
    console.log(`\nfailures (${failures.length}):`);
    for (const failure of failures.slice(0, 40)) {
      const f = failure as { id: string; field: string; expected: string; observed: unknown };
      console.log(`  ${f.id} ${f.field}: expected=${f.expected} observed=${String(f.observed)}`);
    }
    if (failures.length > 40) console.log(`  ... and ${failures.length - 40} more`);
  }
  console.log(`\nreport: ${outPath}`);
}

main().catch((error) => {
  console.error('FAIL post-natural-e2e', error);
  process.exit(1);
});
