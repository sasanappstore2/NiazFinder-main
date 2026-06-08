/**
 * HTTP smoke for /post need-intake routes (requires dev server).
 *
 * Run with Next dev up:
 *   npm run test:post-api-smoke
 *
 * Env:
 *   SMOKE_BASE_URL — default http://localhost:3000
 */
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const SHOP_RAHN_TEXT = [
  'مغازه در خیابان سجاد مشهد',
  'تا سقف سرامیک باشه یک میلیارد رهن دارم ۱۰۰ میلیون اجاره',
].join('\n');

async function parseSseBody(body: string): Promise<{ types: string[]; title?: string }> {
  const types: string[] = [];
  let title: string | undefined;
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const ev = JSON.parse(line.slice(6)) as { type?: string; title?: string };
      if (ev.type) types.push(ev.type);
      if (ev.title) title = ev.title;
    } catch {
      // ignore partial chunks
    }
  }
  return { types, title };
}

async function main(): Promise<void> {
  const failures: string[] = [];

  const analyzeRes = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: SHOP_RAHN_TEXT, cityName: 'مشهد' }),
    signal: AbortSignal.timeout(90_000),
  }).catch((e) => {
    failures.push(`analyze fetch: ${e instanceof Error ? e.message : e}`);
    return null;
  });

  if (analyzeRes) {
    const analyzeJson = (await analyzeRes.json().catch(() => ({}))) as {
      entities?: { transactionType?: string; categorySlug?: string };
      meta?: { engine?: string };
    };
    if (!analyzeRes.ok) failures.push(`analyze status ${analyzeRes.status}`);
    const slug = analyzeJson.entities?.categorySlug;
    if (!slug) failures.push('analyze missing categorySlug');
    const engine = analyzeJson.meta?.engine ?? '';
    if (process.env.NEED_INTAKE_LLM_ENABLED === 'true' && !engine.includes('qwen')) {
      failures.push(`analyze engine expected qwen, got ${engine}`);
    }
  }

  const minimalDraft = {
    needType: 'real-estate',
    sourceText: SHOP_RAHN_TEXT,
    needText: 'مغازه در خیابان سجاد مشهد',
    detailsText: 'تا سقف سرامیک باشه یک میلیارد رهن دارم ۱۰۰ میلیون اجاره',
    entities: {
      city: 'مشهد',
      neighborhood: 'سجاد',
      categorySlug: 'commercial-rent',
      subcategorySlug: 'shop-rent',
      transactionType: 'DEPOSIT_AND_RENT',
    },
    answers: {
      dealType: 'rent_rahn_ejare',
      rahnAmount: 1_000_000_000,
      monthlyRent: 100_000_000,
      location: 'مشهد',
    },
    parsedIntent: { intentType: 'product_search' },
    sections: [],
    turns: [],
  };

  const streamRes = await fetch(`${BASE}/api/need-intake/preview-listing/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft: minimalDraft }),
    signal: AbortSignal.timeout(120_000),
  }).catch((e) => {
    failures.push(`stream fetch: ${e instanceof Error ? e.message : e}`);
    return null;
  });

  if (streamRes) {
    const body = await streamRes.text();
    if (!streamRes.ok) failures.push(`stream status ${streamRes.status}`);
    const { types, title } = await parseSseBody(body);
    if (!types.includes('baseline')) failures.push('stream missing baseline event');
    if (!types.includes('done')) failures.push('stream missing done event');
    if (title && /^فروش/u.test(title) && /رهن/u.test(SHOP_RAHN_TEXT)) {
      failures.push(`stream title deal flip: ${title}`);
    }
  }

  const badTitleRes = await fetch(`${BASE}/api/need-intake/preview-listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draft: {
        ...minimalDraft,
        sourceText: 'x',
      },
      forceTitle: 'x',
    }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (badTitleRes && badTitleRes.status !== 422 && badTitleRes.status !== 400) {
    // optional — route may not expose forceTitle; only warn if 500
    if (badTitleRes.status >= 500) failures.push(`preview-listing server error ${badTitleRes.status}`);
  }

  if (failures.length) {
    console.error('post-api-smoke FAILED:\n' + failures.join('\n'));
    console.error(
      `Hint: start dev server (npm run dev) at ${BASE} and ensure MLX if NEED_INTAKE_LLM_ENABLED=true`
    );
    process.exit(1);
  }

  console.log(`post-api-smoke OK @ ${BASE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
