/**
 * Lists Next.js API routes and heuristically classifies auth requirements.
 * Run: npx tsx scripts/security-route-inventory.ts
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const API_ROOT = join(process.cwd(), 'src/app/api');

type AuthClass = 'none' | 'user' | 'rbac' | 'secret' | 'unknown';

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === 'route.ts') acc.push(p);
  }
  return acc;
}

function classify(content: string, rel: string): AuthClass {
  if (rel.includes('/internal/')) {
    if (content.includes('x-internal-secret') || content.includes('INTERNAL_API_SECRET')) {
      return 'secret';
    }
    return 'unknown';
  }
  if (
    content.includes('requireSuperAdmin') ||
    content.includes('hasSuperAdminPanelAccess') ||
    content.includes('requirePermission') ||
    rel.includes('/super-admin/')
  ) {
    return 'rbac';
  }
  if (content.includes('getAuthUser') || content.includes('requireBusinessAccess')) {
    return 'user';
  }
  if (
    rel.includes('/auth/') ||
    rel.includes('/categories') ||
    rel.includes('/locations') ||
    rel.includes('/search') ||
    rel.includes('/business/browse') ||
    rel.includes('/business/online-stores') ||
    rel.includes('/business/[id]/route') ||
    rel.includes('/specialists/') ||
    rel.includes('/analytics/collect')
  ) {
    return 'none';
  }
  return 'unknown';
}

const routes = walk(API_ROOT).sort();
const rows: { path: string; auth: AuthClass }[] = [];

for (const file of routes) {
  const content = readFileSync(file, 'utf8');
  const rel = file.replace(API_ROOT, '/api').replace(/\/route\.ts$/, '');
  rows.push({ path: rel || '/api', auth: classify(content, rel) });
}

console.log('| Route | Auth |');
console.log('|-------|------|');
for (const r of rows) {
  console.log(`| \`${r.path}\` | ${r.auth} |`);
}
console.log(`\nTotal: ${rows.length} routes`);
console.log(
  `Summary: none=${rows.filter((r) => r.auth === 'none').length}, user=${rows.filter((r) => r.auth === 'user').length}, rbac=${rows.filter((r) => r.auth === 'rbac').length}, secret=${rows.filter((r) => r.auth === 'secret').length}, unknown=${rows.filter((r) => r.auth === 'unknown').length}`
);
