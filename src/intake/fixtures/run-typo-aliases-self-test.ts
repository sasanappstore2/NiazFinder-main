/**
 * Self-test: Persian money-scale typo aliases (میلون/ملیون/ملیارد …) flow
 * through the hybrid intake pipeline and the smart-extractor path.
 * Run: npx tsx src/intake/fixtures/run-typo-aliases-self-test.ts
 */
async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  await stubServerOnly();
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';

  const { applyTypoAliases } = await import(
    '@/intake/intelligence-engine/normalizer/typo-aliases'
  );
  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  // --- unit level: alias rewrites ---
  const cases: Array<[string, string]> = [
    ['رهن ۵۰ میلون', 'رهن ۵۰ میلیون'],
    ['رهن ۵۰ ملیون', 'رهن ۵۰ میلیون'],
    ['رهن ۵۰ ملون', 'رهن ۵۰ میلیون'],
    ['رهن ۵۰ میل یون', 'رهن ۵۰ میلیون'],
    ['رهن ۲ میلیارد', 'رهن ۲ میلیارد'],
    ['رهن ۲ ملیارد', 'رهن ۲ میلیارد'],
    ['رهن ۲ میل یارد', 'رهن ۲ میلیارد'],
  ];
  for (const [input, expected] of cases) {
    assert(applyTypoAliases(input) === expected, `alias failed: ${input} -> ${applyTypoAliases(input)} (want ${expected})`);
  }

  // --- false positives must stay untouched ---
  assert(
    applyTypoAliases('ملارد کرج واقع در کیلومتر ۲۰') === 'ملارد کرج واقع در کیلومتر ۲۰',
    'ملارد (city) must not be rewritten'
  );
  assert(
    applyTypoAliases('من میلیونر شدم') === 'من میلیونر شدم',
    'میلیونر must not be rewritten'
  );

  // --- generic fuzzy corrector: unambiguous single-edit typos of vocab words ---
  const fuzzyCases: Array<[string, string]> = [
    ['اجاره اپارتمن دو خواب با پارکینگو', 'اجاره اپارتمان دو خواب با پارکینگ'],
    ['رهن ۵۰۰ اسانسور داره', 'رهن ۵۰۰ آسانسور داره'],
  ];
  for (const [input, expected] of fuzzyCases) {
    assert(
      applyTypoAliases(input) === expected,
      `fuzzy correct failed: "${input}" -> "${applyTypoAliases(input)}" (want "${expected}")`
    );
  }

  // --- kill switch: INTAKE_FUZZY_CORRECTOR=false disables the fuzzy pass ---
  process.env.INTAKE_FUZZY_CORRECTOR = 'false';
  assert(
    applyTypoAliases('اجاره اپارتمن دو خواب') === 'اجاره اپارتمن دو خواب',
    'kill switch must disable fuzzy correction (regex aliases still run)'
  );
  process.env.INTAKE_FUZZY_CORRECTOR = '';

  // --- end to end: hybrid pipeline (the /post form path) ---
  const rentCases: Array<[string, number, number]> = [
    ['رهن ۵۰ میلیون اجاره ۲ میلیون آپارتمان در تهران', 50_000_000, 2_000_000],
    ['رهن ۵۰ میلون اجاره ۲ میلیون آپارتمان در تهران', 50_000_000, 2_000_000],
    ['رهن ۵۰ ملیون اجاره ۲ میلیون آپارتمان در تهران', 50_000_000, 2_000_000],
    ['رهن ۵۰ ملون اجاره ۲ میلیون آپارتمان در تهران', 50_000_000, 2_000_000],
    ['رهن ۵۰ میل یون اجاره ۲ میلیون آپارتمان در تهران', 50_000_000, 2_000_000],
  ];
  for (const [text, rahn, rent] of rentCases) {
    const result = await runHybridIntakePipeline({ text });
    const fields = result.fields as Record<string, { value?: unknown }>;
    assert(
      fields.rahnAmount?.value === rahn,
      `rahnAmount for "${text}" = ${fields.rahnAmount?.value} (want ${rahn})`
    );
    assert(
      fields.monthlyRent?.value === rent,
      `monthlyRent for "${text}" = ${fields.monthlyRent?.value} (want ${rent})`
    );
    assert(
      fields.budgetMax?.value === rahn,
      `budgetMax for "${text}" = ${fields.budgetMax?.value} (want ${rahn})`
    );
  }

  // --- billion typo through the pipeline ---
  const billion = await runHybridIntakePipeline({ text: 'آپارتمان ۸۰ متری رهن ۲ ملیارد در تهران' });
  const bf = billion.fields as Record<string, { value?: unknown }>;
  assert(bf.rahnAmount?.value === 2_000_000_000, `rahnAmount billion = ${bf.rahnAmount?.value}`);

  console.log('typo-aliases self-test: ALL PASSED');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
