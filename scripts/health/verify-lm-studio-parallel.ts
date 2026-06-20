/**
 * Fire concurrent OpenAI-compatible chat requests to verify LM Studio parallel slots.
 *
 *   NEED_INTAKE_LLM_URL=http://127.0.0.1:1234 npx tsx scripts/health/verify-lm-studio-parallel.ts
 *
 * Success: all requests complete; wall clock < sum of latencies (parallel overlap).
 */
const BASE_URL = (
  process.env.NEED_INTAKE_LLM_URL ??
  process.env.LOCAL_LLM_URL ??
  'http://127.0.0.1:1234'
)
  .replace(/\/$/, '')
  .replace(/\/v1$/, '');

const MODEL =
  process.env.NEED_INTAKE_LLM_MODEL ??
  process.env.LOCAL_LLM_MODEL ??
  'gemma-4-E2B_q4_0-it.gguf';

const PARALLEL = Number(process.env.LOCAL_LLM_PARALLEL_SLOTS ?? 4);

async function postChat(prompt: string, id: number): Promise<{
  id: number;
  ms: number;
  ok: boolean;
  snippet: string;
}> {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 32,
        temperature: 0.1,
        stream: false,
      }),
    });
    const ms = Math.round(performance.now() - started);
    const raw = await res.text();
    if (!res.ok) {
      return { id, ms, ok: false, snippet: raw.slice(0, 80) };
    }
    try {
      const parsed = JSON.parse(raw) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const snippet = (parsed.choices?.[0]?.message?.content ?? '').slice(0, 60);
      return { id, ms, ok: Boolean(snippet), snippet };
    } catch {
      return { id, ms, ok: false, snippet: raw.slice(0, 80) };
    }
  } catch (e) {
    return {
      id,
      ms: Math.round(performance.now() - started),
      ok: false,
      snippet: e instanceof Error ? e.message : 'error',
    };
  }
}

async function main(): Promise<void> {
  console.log(`LM Studio parallel verify | url=${BASE_URL} | model=${MODEL} | n=${PARALLEL}`);

  const healthRes = await fetch(`${BASE_URL}/v1/models`).catch(() => null);
  if (!healthRes?.ok) {
    console.error('FAIL: LM Studio not reachable. Load model and start server on :1234');
    process.exit(1);
  }

  const wallStart = performance.now();
  const results = await Promise.all(
    Array.from({ length: PARALLEL }, (_, i) =>
      postChat(`Reply with exactly one word: READY-${i + 1}`, i + 1)
    )
  );
  const wallMs = Math.round(performance.now() - wallStart);
  const sumMs = results.reduce((a, r) => a + r.ms, 0);
  const okCount = results.filter((r) => r.ok).length;

  for (const r of results) {
    console.log(
      `  #${r.id} ${r.ok ? 'OK' : 'FAIL'} ${r.ms}ms | ${r.snippet.replace(/\s+/g, ' ').slice(0, 50)}`
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
    console.warn('\nWARN: requests may be serializing (check LM Studio Parallel Requests setting)');
  } else {
    console.log('\nOK: parallel LM Studio inference looks healthy');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
