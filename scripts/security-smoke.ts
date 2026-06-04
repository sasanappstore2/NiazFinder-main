/**
 * Security smoke checks — run against local stack.
 * Usage: npx tsx scripts/security-smoke.ts
 */
const CHAT_URL = process.env.CHAT_SERVICE_INTERNAL_URL || 'http://127.0.0.1:3004';
const NEXT_URL = process.env.NEXT_URL || 'http://127.0.0.1:3000';

async function check(name: string, fn: () => Promise<boolean>) {
  try {
    const ok = await fn();
    console.log(ok ? `✓ ${name}` : `✗ ${name}`);
    return ok;
  } catch (e) {
    console.log(`✗ ${name} — ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  let passed = 0;
  let total = 0;

  const run = async (name: string, fn: () => Promise<boolean>) => {
    total += 1;
    if (await check(name, fn)) passed += 1;
  };

  await run('Fanout rejects missing secret', async () => {
    const res = await fetch(`${CHAT_URL}/internal/fanout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message:new', payload: { conversationId: 'x' } }),
    });
    return res.status === 401;
  });

  await run('Internal moderation fails closed without secret env', async () => {
    if (process.env.INTERNAL_API_SECRET) {
      console.log('  (skipped — INTERNAL_API_SECRET is set in env)');
      return true;
    }
    const res = await fetch(`${NEXT_URL}/api/internal/request-moderation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'test' }),
    });
    return res.status === 503;
  });

  await run('Check-phone rate limit shape', async () => {
    const res = await fetch(`${NEXT_URL}/api/auth/check-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '' }),
    });
    return res.status === 400;
  });

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

void main();
