/**
 * Dashboard + mine=1 API auth smoke.
 * Run: npm run test:dashboard-api
 *
 * Offline: validates route handlers require auth (401 without session).
 * Dashboard handler is invoked directly; requests mine=1 is source-verified
 * (imports pull server-only graph that tsx cannot load outside Next).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { GET as dashboardGet } from '@/app/api/dashboard/route';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function expectStatus(
  handler: (req: NextRequest) => Promise<Response>,
  url: string,
  status: number
): Promise<void> {
  const res = await handler(new NextRequest(url));
  assert(res.status === status, `${url} → ${res.status}, expected ${status}`);
}

function assertMineRequiresAuthInSource(): void {
  const src = readFileSync(
    join(process.cwd(), 'src/app/api/requests/route.ts'),
    'utf8'
  );
  assert(src.includes("searchParams.get('mine')"), 'mine query param missing');
  assert(src.includes('getAuthUser'), 'getAuthUser missing in requests route');
  assert(src.includes('401'), '401 response missing for unauthenticated mine=1');
  assert(
    /if\s*\(\s*mine\s*\)[\s\S]*?getAuthUser/.test(src),
    'mine branch must call getAuthUser'
  );
}

async function main(): Promise<void> {
  await expectStatus(dashboardGet, 'http://localhost/api/dashboard', 401);
  assertMineRequiresAuthInSource();
  console.log('dashboard-api self-test: OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
