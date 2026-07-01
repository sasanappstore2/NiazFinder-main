/**
 * Generate side-by-side compare HTML from filing benchmark reports.
 * Run: npx tsx scripts/filing/generate-compare-report.ts
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPORTS_ROOT = path.join(process.cwd(), 'reports', 'filing-benchmark');

async function findLatestDirs(): Promise<{ local?: string; external?: string }> {
  let entries: string[] = [];
  try {
    entries = await readdir(REPORTS_ROOT);
  } catch {
    return {};
  }

  const dirs = entries
    .filter((e) => !e.startsWith('.'))
    .sort()
    .reverse();

  let local: string | undefined;
  let external: string | undefined;

  for (const d of dirs) {
    const full = path.join(REPORTS_ROOT, d);
    if (!local && d.startsWith('local-')) local = full;
    if (!external) {
      try {
        const children = await readdir(full);
        if (children.includes('external')) external = full;
      } catch {
        /* skip */
      }
    }
    if (local && external) break;
  }

  return { local, external };
}

async function listPngs(dir: string): Promise<string[]> {
  try {
    const walk = async (base: string): Promise<string[]> => {
      const entries = await readdir(base, { withFileTypes: true });
      const out: string[] = [];
      for (const ent of entries) {
        const full = path.join(base, ent.name);
        if (ent.isDirectory()) out.push(...(await walk(full)));
        else if (ent.name.endsWith('.png')) out.push(full);
      }
      return out;
    };
    return walk(dir);
  } catch {
    return [];
  }
}

async function loadPatterns() {
  try {
    const raw = await readFile(path.join(process.cwd(), 'scripts/filing/design-patterns.json'), 'utf8');
    return JSON.parse(raw) as { patterns?: Array<{ id: string; rule: string; sources: string[]; adoptedIn: string[] }> };
  } catch {
    return { patterns: [] };
  }
}

async function main() {
  const { local, external } = await findLatestDirs();
  const patterns = await loadPatterns();
  const outDir = path.join(REPORTS_ROOT, 'final');
  await mkdir(outDir, { recursive: true });

  const localShots = local ? await listPngs(path.join(local, 'local')) : [];
  const externalShots = external ? await listPngs(path.join(external, 'external')) : [];

  const rel = (p: string) => path.relative(outDir, p).replace(/\\/g, '/');

  const localSection = localShots.length
    ? localShots
        .map(
          (p) =>
            `<figure><img src="${rel(p)}" alt="${path.basename(p)}" loading="lazy" /><figcaption>${path.basename(p)}</figcaption></figure>`
        )
        .join('\n')
    : '<p>No local screenshots yet. Run <code>npm run test:filing-visual-qa</code>.</p>';

  const externalSection = externalShots.length
    ? externalShots
        .slice(0, 24)
        .map(
          (p) =>
            `<figure><img src="${rel(p)}" alt="${path.basename(p)}" loading="lazy" /><figcaption>${path.basename(p)}</figcaption></figure>`
        )
        .join('\n')
    : '<p>No external benchmark shots yet. Run <code>npm run test:filing-benchmark-capture</code>.</p>';

  const patternsTable =
    patterns.patterns
      ?.map(
        (p) =>
          `<tr><td>${p.id}</td><td>${p.sources.join(', ')}</td><td>${p.rule}</td><td>${p.adoptedIn.join(', ')}</td></tr>`
      )
      .join('\n') ?? '';

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>Filing Redesign Compare</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; background: #f8fafc; color: #0f172a; }
    h1, h2 { letter-spacing: -0.02em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    figure { margin: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    img { width: 100%; height: auto; display: block; }
    figcaption { padding: 0.5rem 0.75rem; font-size: 0.75rem; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; background: #fff; border-radius: 12px; overflow: hidden; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: right; vertical-align: top; }
    th { background: #f1f5f9; }
    section { margin-bottom: 2.5rem; }
  </style>
</head>
<body>
  <h1>مقایسه ریدیزاین فایلینگ</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <section>
    <h2>الگوهای adopt‌شده</h2>
    <table>
      <thead><tr><th>الگو</th><th>منابع</th><th>قانون</th><th>پیاده‌سازی</th></tr></thead>
      <tbody>${patternsTable}</tbody>
    </table>
  </section>

  <section>
    <h2>NiazFinder — local QA</h2>
    <div class="grid">${localSection}</div>
  </section>

  <section>
    <h2>Benchmark — external (نمونه)</h2>
    <div class="grid">${externalSection}</div>
  </section>
</body>
</html>`;

  const outPath = path.join(outDir, 'compare.html');
  await writeFile(outPath, html);
  console.log(`[compare-report] → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
