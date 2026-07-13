/**
 * Proposal-first + mezōn regression self-test.
 * Run: npx tsx src/intake/agent/fixtures/run-proposal-first-self-test.ts
 */
import { createRequire } from 'node:module';

async function stubServerOnly(): Promise<void> {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
    require,
    paths: [],
    children: [],
    parent: null,
  } as unknown as NodeModule;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  await stubServerOnly();
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';

  const { runIntakeAgent } = await import('@/intake/agent/run-intake-agent');
  const { applyUserCorrectionToDraft } = await import(
    '@/intake/agent/apply-user-correction'
  );
  const { projectFields } = await import('@/intake/agent/build-agent-result');
  const { resolveFieldAction } = await import('@/intake/agent/confidence-policy');

  assert(resolveFieldAction(0.99) === 'confirm', 'proposal-first never auto_accept');

  const MEZON =
    'من یک مزون میخوام در مجیدیه ۱۰۰ میلیون رهن دارم ۱ میلیون اجاره میتونم بدم';

  const agent = await runIntakeAgent({
    text: MEZON,
    // URL category=services must NOT lock repairs
    formHints: {
      categorySlug: 'services',
      categoryLockedByUser: false,
    },
    citySlug: 'tehran',
    cityName: 'تهران',
  });

  const keys = agent.fields.map((f) => f.key);
  assert(!keys.includes('dealType'), 'no dealType duplicate');
  assert(!keys.includes('province'), 'no province chip');
  assert(!keys.includes('subcategorySlug'), 'single category proposal only');

  const cat = agent.fields.find((f) => f.key === 'categorySlug');
  const catVal = String(cat?.value ?? agent.categorySlug ?? agent.subcategorySlug ?? '');
  assert(
    /commercial-rent|shop-rent|office-rent/i.test(catVal),
    `expected commercial-rent path, got ${catVal}`
  );
  assert(!/repair|خدمات|services/i.test(catVal), `must not be repairs/services, got ${catVal}`);

  const tx = agent.fields.find((f) => f.key === 'transactionType');
  assert(tx, 'transactionType proposed');
  assert(
    /DEPOSIT_AND_RENT|RENT|rent_rahn|رهن/i.test(String(tx!.value)),
    `expected rent deal, got ${String(tx!.value)}`
  );

  const rahn = agent.fields.find((f) => f.key === 'rahnAmount' || f.key === 'deposit');
  const rent = agent.fields.find((f) => f.key === 'monthlyRent');
  assert(rahn, 'rahn/deposit proposed');
  assert(rent, 'monthlyRent proposed');

  const rentDeal = true;
  if (rentDeal) {
    assert(
      !keys.includes('budgetMax') || !rahn || !rent,
      'budgetMax should be hidden when rahn/rent present'
    );
  }

  const shopOfficeQ = agent.suggestedQuestions.some((q) =>
    /مغازه|دفتر|اداری|shop|office/i.test(q.questionFa)
  );
  assert(shopOfficeQ || /commercial-rent/i.test(catVal), 'shop/office question or commercial parent');

  // Confirm commits one field; reject writes nothing
  const emptyish = {
    ...agent.draft,
    entities: {},
    answers: {},
  };
  const confirmed = applyUserCorrectionToDraft(emptyish, {
    fieldKey: 'transactionType',
    value: tx!.value,
  });
  assert(
    String((confirmed.entities as Record<string, unknown>).transactionType ?? '') ===
      String(tx!.value),
    'confirm commits field'
  );

  // projectFields deterministic across runs
  const a = projectFields(agent.fieldMeta);
  const b = projectFields(agent.fieldMeta);
  assert(
    JSON.stringify(a.map((f) => [f.key, f.value])) ===
      JSON.stringify(b.map((f) => [f.key, f.value])),
    'projectFields deterministic'
  );

  // Parallel determinism: three identical analyses → same proposal keys/values
  const runs = await Promise.all([
    runIntakeAgent({ text: MEZON, citySlug: 'tehran', cityName: 'تهران' }),
    runIntakeAgent({ text: MEZON, citySlug: 'tehran', cityName: 'تهران' }),
    runIntakeAgent({ text: MEZON, citySlug: 'tehran', cityName: 'تهران' }),
  ]);
  const sig = (r: typeof agent) =>
    JSON.stringify(
      r.fields
        .map((f) => [f.key, f.value])
        .sort((x, y) => String(x[0]).localeCompare(String(y[0])))
    );
  assert(sig(runs[0]!) === sig(runs[1]!), 'parallel run 0==1');
  assert(sig(runs[1]!) === sig(runs[2]!), 'parallel run 1==2');

  console.log('✓ proposal-first mezōn regression + determinism');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
