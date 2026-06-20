/**
 * Self-test: critical intake catalog covers all pack slugs with valid registry fields.
 * Run: npm run test:critical-intake-catalog
 */
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import {
  CRITICAL_BY_SLUG,
  getCriticalIntakeFields,
} from '@/intake/template/critical-intake-catalog';

const MIN_FIELDS_DEFAULT = 2;

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

  const slugs = [
    ...new Set([
      ...Object.keys(CRITICAL_BY_SLUG),
      ...CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).map((c) => c.slug),
    ]),
  ];

  let failed = 0;
  for (const slug of slugs) {
    const registry = getMergedFieldsForCategory(slug, 'need').filter((f) => f.intake !== false);
    const minRequired =
      registry.length >= 3 ? MIN_FIELDS_DEFAULT : Math.max(1, Math.min(MIN_FIELDS_DEFAULT, registry.length));
    const fields = getCriticalIntakeFields(slug);
    if (fields.length < minRequired) {
      console.error(`FAIL ${slug}: only ${fields.length} critical fields (min ${minRequired})`);
      failed++;
      continue;
    }

    const registryKeys = new Set(registry.map((f) => f.key));
    for (const key of fields) {
      if (!registryKeys.has(key)) {
        console.error(`FAIL ${slug}: critical field ${key} not in registry`);
        failed++;
      }
    }
  }

  if (failed > 0) {
    console.error(`critical-intake-catalog: ${failed} failures`);
    process.exit(1);
  }
  console.log(`critical-intake-catalog OK (${slugs.length} slugs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
