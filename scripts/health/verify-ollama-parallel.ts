/**
 * Fire 4 concurrent Ollama /api/generate requests to verify parallel slots are active.
 *
 *   OLLAMA_URL=http://127.0.0.1:8101 OLLAMA_MODEL=gemma2:2b npx tsx scripts/health/verify-ollama-parallel.ts
 *
 * Success: all 4 complete; overlapping start times + total wall clock < sum of latencies.
 */
import { Agent, request as httpRequest } from 'node:http';
import { URL } from 'node:url';

const OLLAMA_URL = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:8101').replace(/\/$/, '');
const MODEL = process.env.OLLAMA_MODEL ?? 'gemma4-e2b-it';
const PARALLEL = Number(process.env.OLLAMA_PARALLEL_TEST_COUNT ?? 4);

const agent = new Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
});

function postGenerate(prompt: string, id: number): Promise<{ id: number; ms: number; ok: boolean; snippet: string }> {
  const started = performance.now();
  const body = JSON.stringify({
    model: MODEL,
    prompt,
    stream: false,
    options: { num_predict: 32, temperature: 0.1 },
  });

  return new Promise((resolve) => {
    const url = new URL(`${OLLAMA_URL}/api/generate`);
    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const ms = Math.round(performance.now() - started);
          let snippet = '';
          let ok = res.statusCode === 200;
          try {
            const parsed = JSON.parse(raw) as { response?: string };
            snippet = (parsed.response ?? '').slice(0, 60);
            ok = ok && Boolean(snippet);
          } catch {
            ok = false;
            snippet = raw.slice(0, 80);
          }
          resolve({ id, ms, ok, snippet });
        });
      },
    );
    req.on('error', (e) => {
      resolve({
        id,
        ms: Math.round(performance.now() - started),
        ok: false,
        snippet: e.message,
      });
    });
    req.write(body);
    req.end();
  });
}

async function main(): Promise<void> {
  console.log(`Ollama parallel verify | url=${OLLAMA_URL} | model=${MODEL} | n=${PARALLEL}`);

  const healthRes = await fetch(`${OLLAMA_URL}/api/tags`).catch(() => null);
  if (!healthRes?.ok) {
    console.error('FAIL: Ollama not reachable. Start: docker compose --profile ai up -d ollama ollama-init');
    process.exit(1);
  }

  const wallStart = performance.now();
  const prompts = Array.from({ length: PARALLEL }, (_, i) =>
    postGenerate(`Reply with exactly one word: READY-${i + 1}`, i + 1),
  );
  const results = await Promise.all(prompts);
  const wallMs = Math.round(performance.now() - wallStart);
  const sumMs = results.reduce((a, r) => a + r.ms, 0);
  const okCount = results.filter((r) => r.ok).length;

  for (const r of results) {
    console.log(
      `  #${r.id} ${r.ok ? 'OK' : 'FAIL'} ${r.ms}ms | ${r.snippet.replace(/\s+/g, ' ').slice(0, 50)}`,
    );
  }

  const overlapped = wallMs < sumMs * 0.85;
  console.log(`\nWall: ${wallMs}ms | Sum of requests: ${sumMs}ms | Parallel hint: ${overlapped ? 'yes' : 'weak'}`);
  console.log(`Passed: ${okCount}/${PARALLEL}`);

  if (okCount < PARALLEL) {
    console.error('\nFAIL: not all requests succeeded');
    process.exit(1);
  }

  if (!overlapped && PARALLEL > 1) {
    console.warn('\nWARN: requests may be serializing (check OLLAMA_NUM_PARALLEL and load)');
  } else {
    console.log('\nOK: parallel Ollama inference looks healthy');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
