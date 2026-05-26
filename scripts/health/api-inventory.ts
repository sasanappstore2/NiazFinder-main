/**
 * List API route files under src/app/api. Run: npx tsx scripts/health/api-inventory.ts
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const apiRoot = join(import.meta.dirname, '../../src/app/api');

function walk(dir: string, prefix = ''): string[] {
  const entries = readdirSync(dir);
  const routes: string[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) {
      routes.push(...walk(full, rel));
    } else if (name === 'route.ts') {
      routes.push(`/api/${prefix}`);
    }
  }
  return routes.sort();
}

const routes = walk(apiRoot);
const report = {
  timestamp: new Date().toISOString(),
  count: routes.length,
  routes,
};

const outDir = join(import.meta.dirname, '../../reports');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'api-inventory.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath} (${routes.length} routes)`);
