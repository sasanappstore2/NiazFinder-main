/**
 * Generate a versioned OpenAPI 3.1 skeleton from src/app/api route files.
 *
 * Heuristic and honest: methods and auth requirements are detected
 * statically (getAuthUser -> bearer, verifyInternalApiSecret -> internal
 * key). Hand-verified request/response shapes live in enrichments.json.
 * Everything else is marked accordingly — do not treat undocumented
 * operations as stable.
 *
 * Run: npm run docs:openapi   (writes docs/openapi.json)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../..');
const apiRoot = join(root, 'src/app/api');

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

interface Enrichment {
  summary?: string;
  description?: string;
  requestBody?: unknown;
  responses?: unknown;
}

const enrichments: Record<string, Enrichment> = JSON.parse(
  readFileSync(join(import.meta.dirname, 'enrichments.json'), 'utf8')
);

function walk(dir: string, prefix = ''): { file: string; route: string }[] {
  const out: { file: string; route: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (name === 'route.ts') out.push({ file: full, route: `/api/${prefix}` });
  }
  return out;
}

function openApiPath(route: string): string {
  return route.replace(/\[([^\]/]+)\]/g, '{$1}');
}

function detectAuth(source: string): { security: unknown[]; note: string } {
  if (source.includes('verifyInternalApiSecret')) {
    return {
      security: [{ internalSecret: [] }],
      note: 'Internal/worker route. Requires x-internal-secret header; fails closed (503 unconfigured, 403 mismatch).',
    };
  }
  if (source.includes('getAuthUser') || source.includes('getServerSession') || source.includes('requireAuth')) {
    return {
      security: [{ bearerAuth: [] }],
      note: 'Authenticated route (Bearer token). Elevated operations additionally require ADMIN / SUPER_ADMIN role.',
    };
  }
  return {
    security: [],
    note: 'No server-side auth call detected statically — verify before treating as public.',
  };
}

const paths: Record<string, unknown> = {};
for (const { file, route } of walk(apiRoot).sort((a, b) => a.route.localeCompare(b.route))) {
  const source = readFileSync(file, 'utf8');
  const methods = METHODS.filter((m) => new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(source));
  if (methods.length === 0) continue;
  const { security, note } = detectAuth(source);
  const tag = route.split('/')[2] || 'root';
  const pathKey = openApiPath(route);
  const operations: Record<string, unknown> = {};
  for (const method of methods) {
    const key = `${method} ${route}`;
    const enriched = enrichments[key];
    operations[method.toLowerCase()] = {
      tags: [tag],
      summary: enriched?.summary ?? `${method} ${route}`,
      description: [enriched?.description, note].filter(Boolean).join('\n\n'),
      ...(enriched?.requestBody ? { requestBody: enriched.requestBody } : {}),
      responses: enriched?.responses ?? {
        '200': { description: 'Success (schema not yet documented — see route source).' },
        '400': { description: 'Validation error.' },
        '401': { description: 'Unauthenticated.' },
        '403': { description: 'Forbidden.' },
      },
      ...(security.length > 0 ? { security } : {}),
    };
  }
  paths[pathKey] = operations;
}

const document = {
  openapi: '3.1.0',
  info: {
    title: 'NiazFinder API',
    version: '0.2.x-unstable',
    description:
      'Generated skeleton of the Next.js App Router API surface. ' +
      'Methods and auth requirements are statically detected; only operations ' +
      'with explicit request/response schemas are stable. Regenerate with `npm run docs:openapi`.',
    license: { name: 'MIT', url: 'https://github.com/sasanappstore2/NiazFinder-main/blob/main/LICENSE' },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local dev (`npm run dev`)' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'User token from phone-OTP login (AuthToken).' },
      internalSecret: {
        type: 'apiKey',
        in: 'header',
        name: 'x-internal-secret',
        description: 'INTERNAL_API_SECRET for worker/cron routes. Constant-time compare, fail-closed.',
      },
    },
  },
  paths,
};

writeFileSync(join(root, 'docs/openapi.json'), JSON.stringify(document, null, 2) + '\n');
console.log(`Wrote docs/openapi.json (${Object.keys(paths).length} paths)`);
