import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeCardText } from '@/lib/filing/ingest/intake-card-analyzer';
import { compileBlueprintFromDiscovery } from '@/lib/filing/ingest/portal-families/blueprint-compiler';

const ROOT = process.cwd();
const FIXTURES = join(ROOT, 'fixtures/filing-portals');

function pythonDiscover(site: string, html: string): unknown {
  const out = execSync(
    `cd "${join(ROOT, 'mini-services/estate-scrape')}" && PYTHONPATH=. .venv/bin/python -c "import json,sys; from app.filing_feed.site_indexer import discover_from_html; print(json.dumps(discover_from_html(sys.stdin.read(), 'https://${site}.test/', 'مشهد'), ensure_ascii=False))"`,
    { input: html, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );
  return JSON.parse(out.trim());
}

function verifyMaskanyabanBlueprint() {
  const site = 'maskanyaban';
  const blueprint = JSON.parse(readFileSync(join(FIXTURES, site, 'blueprint.json'), 'utf-8')) as {
    listPage?: { containerSelector?: string | null };
    fieldMap?: Record<string, unknown>;
  };
  const container = blueprint.listPage?.containerSelector;
  if (!container) {
    throw new Error(`${site}: missing container selector in blueprint.json`);
  }
  if (Object.keys(blueprint.fieldMap ?? {}).length < 3) {
    throw new Error(`${site}: blueprint fieldMap too small`);
  }
  const out = execSync(
    `cd "${join(ROOT, 'mini-services/estate-scrape')}" && PYTHONPATH=. .venv/bin/python -m app.filing_feed.run_maskanyaban_self_test`,
    { encoding: 'utf-8' }
  );
  if (!out.includes('offline fixture')) {
    throw new Error(`${site}: maskanyaban offline self-test did not run`);
  }
  console.log(`[OK] ${site}`, container);
}

function main() {
  verifyMaskanyabanBlueprint();

  for (const site of ['showmelk', 'generic-portal'] as const) {
    const html = readFileSync(join(FIXTURES, site, site === 'generic-portal' ? 'list-page-1.html' : 'list-sample.html'), 'utf-8');
    const raw = pythonDiscover(site, html) as Parameters<typeof compileBlueprintFromDiscovery>[0];
    const compiled = compileBlueprintFromDiscovery(raw, 'مشهد');
    if (!compiled.blueprint.listPage?.containerSelector) {
      throw new Error(`${site}: missing container selector`);
    }
    if (!compiled.blueprint.listPage?.itemLinkSelector) {
      throw new Error(`${site}: missing itemLinkSelector`);
    }
    if (compiled.fieldGuesses.length < 3) {
      throw new Error(`${site}: too few field guesses`);
    }
    const cardText = compiled.sampleCards[0] ?? html.slice(0, 300);
    const intake = analyzeCardText(cardText, 'مشهد');
    if (!intake.find((g) => g.key === 'fileCode' || g.key === 'dealType')) {
      throw new Error(`${site}: intake failed on sample card`);
    }
    console.log(`[OK] ${site}`, compiled.blueprint.listPage.containerSelector);
  }
  console.log('ALL FILING DISCOVERY TESTS PASSED');
}

main();
