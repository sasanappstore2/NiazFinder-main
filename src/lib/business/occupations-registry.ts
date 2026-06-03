import { promises as fs } from 'fs';
import path from 'path';
import type { BusinessOccupation } from '@/config/business-occupation-types';
import {
  getDefaultManagedOccupations,
  getCachedOccupationsSync,
  setOccupationsCache,
  invalidateOccupationsCache,
  normalizeOccupation,
  getOccupationsCacheTimestamp,
  type ManagedBusinessOccupation,
} from '@/lib/business/occupations-cache';

export type { ManagedBusinessOccupation } from '@/lib/business/occupations-cache';

export type ManagedOccupationsData = {
  occupations: ManagedBusinessOccupation[];
  updatedAt: string;
};

const occupationsFilePath = path.join(process.cwd(), 'src', 'data', 'business-occupations.json');

const CACHE_TTL_MS = 60_000;

function parseManagedData(raw: unknown): ManagedBusinessOccupation[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeOccupation(item as BusinessOccupation));
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as ManagedOccupationsData).occupations)) {
    return (raw as ManagedOccupationsData).occupations.map(normalizeOccupation);
  }
  return getDefaultManagedOccupations();
}

export {
  getDefaultManagedOccupations,
  getCachedOccupationsSync,
  setOccupationsCache,
  invalidateOccupationsCache,
} from '@/lib/business/occupations-cache';

export async function readManagedOccupations(): Promise<ManagedBusinessOccupation[]> {
  const cacheAt = getOccupationsCacheTimestamp();
  const now = Date.now();
  if (cacheAt > 0 && now - cacheAt < CACHE_TTL_MS) {
    return getCachedOccupationsSync();
  }

  try {
    const raw = await fs.readFile(occupationsFilePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const data = parseManagedData(parsed);
    setOccupationsCache(data);
    return data;
  } catch {
    const data = getDefaultManagedOccupations();
    setOccupationsCache(data);
    return data;
  }
}

export async function writeManagedOccupations(
  occupations: ManagedBusinessOccupation[]
): Promise<ManagedOccupationsData> {
  const next: ManagedOccupationsData = {
    occupations: occupations.map(normalizeOccupation),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(occupationsFilePath), { recursive: true });
  await fs.writeFile(occupationsFilePath, JSON.stringify(next, null, 2), 'utf8');
  setOccupationsCache(next.occupations);
  return next;
}

export async function warmOccupationsCache(): Promise<ManagedBusinessOccupation[]> {
  invalidateOccupationsCache();
  return readManagedOccupations();
}
