/**
 * Services health chain: chat-service, Nest backend, intake-mlx.
 * Run: npm run health:services
 */
import { execSync } from 'node:child_process';

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.replace(/\/$/, '') || 'http://localhost:3004';
const NEST_URL = (process.env.NEST_API_URL || process.env.INTAKE_QUEUE_URL || 'http://localhost:4000').replace(/\/$/, '');
const MLX_URL = (process.env.NEED_INTAKE_MLX_URL || 'http://localhost:8100').replace(/\/$/, '');

type StepResult = { name: string; ok: boolean; detail?: string };

async function ping(url: string, path = ''): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok || res.status < 500, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function main(): Promise<void> {
  const results: StepResult[] = [];

  const chat = await ping(CHAT_URL, '/health');
  results.push({
    name: 'chat-service',
    ok: chat.ok,
    detail: `HTTP ${chat.status} @ ${CHAT_URL}/health`,
  });

  const nestHealth = await ping(NEST_URL, '/health');
  const nestApiHealth = await ping(NEST_URL, '/api/health');
  results.push({
    name: 'nest-backend',
    ok: nestHealth.ok || nestApiHealth.ok,
    detail: `/health=${nestHealth.status} /api/health=${nestApiHealth.status}`,
  });

  const mlx = await ping(MLX_URL, '/health');
  results.push({
    name: 'intake-mlx',
    ok: mlx.ok,
    detail: `HTTP ${mlx.status} @ ${MLX_URL}/health`,
  });

  const skipServices = process.env.SKIP_SERVICES_HEALTH === '1';
  const requiredFail = results.filter((r) => !r.ok);

  if (!skipServices && requiredFail.length > 0) {
    console.error('services-health FAILED (set SKIP_SERVICES_HEALTH=1 to skip):');
    requiredFail.forEach((r) => console.error(`  - ${r.name}: ${r.detail}`));
    process.exit(1);
  }

  if (skipServices) {
    console.log('SKIP_SERVICES_HEALTH=1 — reporting only');
  }

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));

  try {
    execSync('npm run test:guard-api-client', { stdio: 'inherit', cwd: process.cwd() });
  } catch {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
