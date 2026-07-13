/**
 * Self-test: critical filter suggestions are chip-only (no answer mutation).
 * Run: npm run test:critical-suggestions
 */
import { createEmptyFieldBag, setField } from '@/intake/intelligence-engine/types';
import { inferCriticalFilterSuggestions } from '@/intake/intelligence-engine/suggestions/critical-filter-suggestions';

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

async function main(): Promise<void> {
  await stubServerOnly();

  const bag = createEmptyFieldBag();
  setField(bag, 'categorySlug', { value: 'apartment-rent', confidence: 0.9, source: 'rule' });
  setField(bag, 'subcategorySlug', { value: 'apartment-rent', confidence: 0.9, source: 'rule' });
  setField(bag, 'rooms', { value: 2, confidence: 0.85, source: 'rule' });

  const answers: Record<string, unknown> = {};
  const suggestions = inferCriticalFilterSuggestions({
    categorySlug: 'apartment-rent',
    fieldBag: bag,
    existingAnswers: answers,
  });

  const roomsSuggestion = suggestions.find((s) => s.fieldKey === 'rooms');
  if (!roomsSuggestion || roomsSuggestion.value !== 2) {
    console.error('FAIL: expected rooms=2 suggestion', suggestions);
    process.exit(1);
  }

  if (answers.rooms != null) {
    console.error('FAIL: answers mutated', answers);
    process.exit(1);
  }

  setField(bag, 'rooms', { value: 2, confidence: 0.9, source: 'user', lockedByUser: true });
  const afterLock = inferCriticalFilterSuggestions({
    categorySlug: 'apartment-rent',
    fieldBag: bag,
    existingAnswers: {},
  });
  if (afterLock.some((s) => s.fieldKey === 'rooms')) {
    console.error('FAIL: suggestion for filled/locked rooms');
    process.exit(1);
  }

  console.log('test:critical-suggestions OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
