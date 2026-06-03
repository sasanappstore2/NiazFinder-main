import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '../..');
export const GEO_DIR = path.join(ROOT, 'src/data/geo');
export const PROVINCES_DIR = path.join(GEO_DIR, 'provinces');
export const RAW_DIR = path.join(GEO_DIR, 'raw');

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export type AdminProvince = {
  id: string;
  name: string;
  nameEn: string;
  cities: Array<{ id: string; name: string; nameEn?: string }>;
};

export function loadAdminProvinces(): AdminProvince[] {
  const data = readJson<{ countries: Array<{ provinces: AdminProvince[] }> }>(
    path.join(ROOT, 'src/data/admin-locations.json')
  );
  return data.countries[0]!.provinces;
}

export function normalizeProvinceSlug(input: string, slugMap: Record<string, string>): string {
  const aliases = readJson<{ legacySlugAliases: Record<string, string> }>(
    path.join(GEO_DIR, 'province-slug-map.json')
  ).legacySlugAliases;
  return aliases[input] ?? slugMap[input] ?? input;
}
