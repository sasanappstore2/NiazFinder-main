import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { CategoryFilterField } from '@/config/category-filters/types';

export type CategoryFieldSpecEntry = {
  fields: CategoryFilterField[];
  history: CategoryFilterField[][];
  updatedAt: string;
};

export type IntakeFieldSpecStore = {
  version: number;
  categories: Record<string, CategoryFieldSpecEntry>;
};

const STORE_VERSION = 1;
const MAX_HISTORY = 10;

function storePath(): string {
  const custom = process.env.INTAKE_FIELD_SPEC_STORE_PATH?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return path.join(process.cwd(), 'data', 'intake-field-spec-overrides.json');
}

let memoryCache: IntakeFieldSpecStore | null = null;

function emptyStore(): IntakeFieldSpecStore {
  return { version: STORE_VERSION, categories: {} };
}

export async function loadIntakeFieldSpecStore(): Promise<IntakeFieldSpecStore> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<IntakeFieldSpecStore>;
    memoryCache = {
      version: parsed.version ?? STORE_VERSION,
      categories: parsed.categories ?? {},
    };
  } catch {
    memoryCache = emptyStore();
  }
  return memoryCache;
}

async function persistStore(store: IntakeFieldSpecStore): Promise<void> {
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2), 'utf8');
  memoryCache = store;
}

function ensureMemoryCacheSync(): void {
  if (memoryCache) return;
  try {
    const file = storePath();
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw) as Partial<IntakeFieldSpecStore>;
      memoryCache = {
        version: parsed.version ?? STORE_VERSION,
        categories: parsed.categories ?? {},
      };
    } else {
      memoryCache = emptyStore();
    }
  } catch {
    memoryCache = emptyStore();
  }
}

export function getActiveIntakeFieldOverrides(categorySlug: string): CategoryFilterField[] {
  ensureMemoryCacheSync();
  const entry = memoryCache?.categories[categorySlug];
  return entry?.fields ?? [];
}

export async function listIntakeFieldSpecCategories(): Promise<
  Array<{ slug: string; fieldCount: number; updatedAt: string | null }>
> {
  const store = await loadIntakeFieldSpecStore();
  return Object.entries(store.categories).map(([slug, entry]) => ({
    slug,
    fieldCount: entry.fields.length,
    updatedAt: entry.updatedAt ?? null,
  }));
}

export async function getCategoryFieldSpecEntry(
  categorySlug: string
): Promise<CategoryFieldSpecEntry | null> {
  const store = await loadIntakeFieldSpecStore();
  return store.categories[categorySlug] ?? null;
}

export async function saveCategoryFieldOverrides(
  categorySlug: string,
  fields: CategoryFilterField[]
): Promise<CategoryFieldSpecEntry> {
  const store = await loadIntakeFieldSpecStore();
  const prev = store.categories[categorySlug];
  const history = [...(prev?.history ?? [])];
  if (prev?.fields?.length) {
    history.unshift(prev.fields);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  }

  const entry: CategoryFieldSpecEntry = {
    fields,
    history,
    updatedAt: new Date().toISOString(),
  };
  store.categories[categorySlug] = entry;
  await persistStore(store);
  return entry;
}

export async function deleteCategoryFieldOverrides(categorySlug: string): Promise<boolean> {
  const store = await loadIntakeFieldSpecStore();
  if (!store.categories[categorySlug]) return false;
  delete store.categories[categorySlug];
  await persistStore(store);
  return true;
}

export async function rollbackCategoryFieldOverrides(
  categorySlug: string
): Promise<CategoryFieldSpecEntry | null> {
  const store = await loadIntakeFieldSpecStore();
  const entry = store.categories[categorySlug];
  if (!entry?.history.length) return null;

  const [restored, ...rest] = entry.history;
  const next: CategoryFieldSpecEntry = {
    fields: restored,
    history: rest,
    updatedAt: new Date().toISOString(),
  };
  store.categories[categorySlug] = next;
  await persistStore(store);
  return next;
}

export function exportCategoryFieldsAsTs(
  categorySlug: string,
  fields: CategoryFilterField[]
): string {
  return `/** Auto-export — ${categorySlug} — ${new Date().toISOString()} */\nexport const ${categorySlug.replace(/[^a-zA-Z0-9]/g, '_')}_INTAKE_FIELDS = ${JSON.stringify(fields, null, 2)} as const;\n`;
}

/** Test-only reset. */
export function clearIntakeFieldSpecStoreCache(): void {
  memoryCache = null;
}
