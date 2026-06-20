/**
 * Extracts requiredFields / optionalFields from rule packs into a client-safe manifest.
 * Run: npx tsx scripts/generate/build-pack-intake-manifest.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKS_DIR = join(process.cwd(), 'src/intake/rules/packs');
const OUT_FILE = join(process.cwd(), 'src/intake/rules/pack-intake-manifest.ts');

interface PackMeta {
  slug: string;
  requiredFields?: string[];
  optionalFields?: string[];
}

interface PackFile {
  meta: PackMeta;
}

const manifest: Record<
  string,
  { requiredFields: string[]; optionalFields: string[] }
> = {};

for (const file of readdirSync(PACKS_DIR)) {
  if (!file.endsWith('.pack.json')) continue;
  const raw = readFileSync(join(PACKS_DIR, file), 'utf8');
  const pack = JSON.parse(raw) as PackFile;
  const slug = pack.meta?.slug;
  if (!slug) continue;
  manifest[slug] = {
    requiredFields: pack.meta.requiredFields ?? [],
    optionalFields: pack.meta.optionalFields ?? [],
  };
}

const output = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run: npx tsx scripts/generate/build-pack-intake-manifest.ts
 */
export interface PackIntakeMeta {
  requiredFields: string[];
  optionalFields: string[];
}

export const PACK_INTAKE_MANIFEST: Record<string, PackIntakeMeta> = ${JSON.stringify(manifest, null, 2)} as const;

export function getPackIntakeMeta(slug: string): PackIntakeMeta | null {
  return PACK_INTAKE_MANIFEST[slug] ?? null;
}

export function getPackRequiredFields(slug: string): string[] {
  return PACK_INTAKE_MANIFEST[slug]?.requiredFields ?? [];
}

export function getPackOptionalFields(slug: string): string[] {
  return PACK_INTAKE_MANIFEST[slug]?.optionalFields ?? [];
}
`;

writeFileSync(OUT_FILE, output, 'utf8');
console.log(`Wrote ${Object.keys(manifest).length} pack entries to ${OUT_FILE}`);
