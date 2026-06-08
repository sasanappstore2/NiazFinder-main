/**
 * CI guard — block new imports of legacy Nest bridge helpers (apiGet/apiPost/...).
 * `apiFetch` to Next `/api/*` is allowed.
 *
 * Run: npm run test:guard-api-client
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const LEGACY_HELPERS = ['apiGet', 'apiPost', 'apiPut', 'apiPatch', 'apiDelete'] as const;

/** Files allowed to define or wrap legacy Nest helpers. */
const ALLOWLIST = new Set(['lib/api-client.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const violations: string[] = [];

for (const file of walk(ROOT)) {
  const rel = file.replace(process.cwd() + '/', '');
  if (ALLOWLIST.has(rel)) continue;

  const src = readFileSync(file, 'utf8');
  if (!src.includes('@/lib/api-client') && !src.includes("from '@/lib/api-client'")) continue;

  for (const helper of LEGACY_HELPERS) {
    const re = new RegExp(`\\b${helper}\\s*\\(`, 'g');
    if (re.test(src)) {
      violations.push(`${rel}: uses deprecated ${helper}()`);
    }
  }
}

if (violations.length) {
  console.error('Deprecated api-client Nest helpers found:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('guard-api-client: OK (no legacy Nest helper usage outside allowlist)');
