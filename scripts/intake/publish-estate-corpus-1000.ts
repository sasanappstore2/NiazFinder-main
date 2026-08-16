/**
 * Publish the estate-1000 corpus through POST /api/need-intake/publish (same path as /post).
 *
 * Usage:
 *   npx tsx scripts/intake/publish-estate-corpus-1000.ts
 *   npx tsx scripts/intake/publish-estate-corpus-1000.ts --limit=18 --dry-run
 */
import '../stress/intake-marathon/stub-server-only';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  projectNeedDraftFromForm,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { ensureDraftMapPin } from '@/lib/need/ensure-draft-map-pin';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const CORPUS_A = join(ROOT, 'tmp/estate-category-1000/corpus.jsonl');
const CORPUS_B = join(ROOT, 'fixtures/estate-category-1000.jsonl');
const OUT_DIR = join(ROOT, 'tmp/estate-publish-1000');
const ARTIFACT_DIR = '/opt/cursor/artifacts';

function parseArgs(argv: string[]) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
  const fromArg = argv.find((a) => a.startsWith('--from='))?.split('=')[1];
  const concArg = argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
  return {
    generate: argv.includes('--generate'),
    dryRun: argv.includes('--dry-run'),
    limit: limitArg ? Number(limitArg) : 1000,
    from: fromArg ? Number(fromArg) : 1,
    concurrency: concArg ? Number(concArg) : 2,
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

async function pollPublishStatus(
  baseUrl: string,
  requestId: string,
  token: string,
  maxAttempts = 20,
  intervalMs = 800
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `${baseUrl}/api/need-intake/publish/status/${encodeURIComponent(requestId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = (await res.json()) as { ready?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || `status poll failed (${res.status})`);
    if (data.ready) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('publish status did not become ready in time');
}

function buildDraft(cse: EstateParagraphCase) {
  const leaf = cse.oracle.leaf[0]!;
  const projected = projectNeedDraftFromForm(null, {
    needText: cse.text,
    detailsText: '',
    categorySlug: 'real-estate',
    subcategorySlug: leaf,
    city: cse.oracle.city,
    neighborhood: cse.oracle.neighborhood ?? '',
    neighborhoodSlug: null,
  });
  return ensureDraftMapPin(recomputeNeedDraft(projected), cse.id);
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
    if (gen.status !== 0) throw new Error(gen.stderr || 'generate failed');
  }

  const corpus = loadCorpus().filter((c) => c.index >= args.from).slice(0, args.limit);
  const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

  const rows: Array<Record<string, unknown>> = [];
  const byLeaf: Record<string, { n: number; pass: number; errors: Record<string, number> }> = {};

  if (args.dryRun) {
    for (const cse of corpus) {
      const leaf = cse.oracle.leaf[0]!;
      byLeaf[leaf] ??= { n: 0, pass: 0, errors: {} };
      byLeaf[leaf].n += 1;
      const draft = buildDraft(cse);
      const validation = validateNeedDraftForPublish(draft);
      if (validation.success) byLeaf[leaf].pass += 1;
      else {
        const key = validation.errors.map((e) => e.field).join(',') || 'invalid';
        byLeaf[leaf].errors[key] = (byLeaf[leaf].errors[key] ?? 0) + 1;
      }
      rows.push({
        id: cse.id,
        leaf,
        ok: validation.success,
        errors: validation.errors,
      });
    }
  } else {
    const email = `estate-publish-${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const reg = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName: 'Estate', lastName: 'Corpus' }),
    });
    const regData = (await reg.json()) as { token?: string; error?: string };
    if (!reg.ok || !regData.token) {
      throw new Error(`register failed ${reg.status} ${JSON.stringify(regData)}`);
    }
    const token = regData.token;

    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, args.concurrency) }, async () => {
      while (cursor < corpus.length) {
        const idx = cursor;
        cursor += 1;
        const cse = corpus[idx]!;
        const leaf = cse.oracle.leaf[0]!;
        byLeaf[leaf] ??= { n: 0, pass: 0, errors: {} };
        byLeaf[leaf].n += 1;
        const t0 = Date.now();
        try {
          const draft = buildDraft(cse);
          const validation = validateNeedDraftForPublish(draft);
          if (!validation.success) {
            const key = validation.errors.map((e) => e.field).join(',') || 'invalid';
            byLeaf[leaf].errors[key] = (byLeaf[leaf].errors[key] ?? 0) + 1;
            rows.push({ id: cse.id, leaf, ok: false, errors: validation.errors, latencyMs: Date.now() - t0 });
            continue;
          }
          const listingPreview = {
            title: resolveDeterministicListingTitle(draft).title,
            description: composeListingFromDraft(draft).description,
            titleSource: 'template' as const,
          };
          const pub = await fetch(`${baseUrl}/api/need-intake/publish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ draft, listingPreview }),
          });
          const pubData = (await pub.json()) as { id?: string; error?: string; code?: string };
          if (!pub.ok || !pubData.id) {
            const key = `${pub.status}:${pubData.code ?? pubData.error ?? 'publish'}`;
            byLeaf[leaf].errors[key] = (byLeaf[leaf].errors[key] ?? 0) + 1;
            rows.push({ id: cse.id, leaf, ok: false, status: pub.status, error: pubData, latencyMs: Date.now() - t0 });
            continue;
          }
          if (pub.status === 202) {
            await pollPublishStatus(baseUrl, pubData.id, token);
          }
          byLeaf[leaf].pass += 1;
          rows.push({ id: cse.id, leaf, ok: true, serviceRequestId: pubData.id, latencyMs: Date.now() - t0 });
        } catch (err) {
          const key = err instanceof Error ? err.message.slice(0, 80) : 'throw';
          byLeaf[leaf].errors[key] = (byLeaf[leaf].errors[key] ?? 0) + 1;
          rows.push({ id: cse.id, leaf, ok: false, error: String(err), latencyMs: Date.now() - t0 });
        }
      }
    });
    await Promise.all(workers);
  }

  const pass = rows.filter((r) => r.ok).length;
  const latencies = rows
    .map((r) => Number(r.latencyMs))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const p = (q: number) =>
    latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(q * (latencies.length - 1)))] : null;
  const report = {
    at: new Date().toISOString(),
    dryRun: args.dryRun,
    total: rows.length,
    pass,
    fail: rows.length - pass,
    pct: rows.length ? Math.round((1000 * pass) / rows.length) / 10 : 0,
    p50: p(0.5),
    p95: p(0.95),
    byLeaf: Object.fromEntries(
      Object.entries(byLeaf).map(([leaf, s]) => [
        leaf,
        { ...s, pct: s.n ? Math.round((1000 * s.pass) / s.n) / 10 : 0 },
      ])
    ),
    sampleFailures: rows.filter((r) => !r.ok).slice(0, 30),
  };

  writeFileSync(join(OUT_DIR, 'results.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'estate_publish_1000_summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.total, pass: report.pass, fail: report.fail, pct: report.pct, p50: report.p50, p95: report.p95 }, null, 2));
  if (report.pct < 95) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
