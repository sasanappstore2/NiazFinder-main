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

import {
  applyLaunchPolicyToOccupations,
  BUSINESS_TAXONOMY_LAUNCH_POLICY_VERSION,
} from '@/lib/business/taxonomy-launch-policy';
import { compareOccupationsByDisplayOrder } from '@/config/business-occupations';

export type ManagedOccupationsData = {
  occupations: ManagedBusinessOccupation[];
  updatedAt: string;
  launchPolicyVersion?: number;
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

/** Add new default occupations and sync known title updates into persisted registry. */
function syncOccupationsWithDefaults(
  data: ManagedBusinessOccupation[]
): { data: ManagedBusinessOccupation[]; changed: boolean } {
  const defaults = getDefaultManagedOccupations();
  const bySlug = new Map(data.map((o) => [o.slug, o]));
  let changed = false;

  for (const def of defaults) {
    const existing = bySlug.get(def.slug);
    if (!existing) {
      bySlug.set(def.slug, def);
      changed = true;
      continue;
    }
    if (existing.title !== def.title || existing.englishTitle !== def.englishTitle) {
      bySlug.set(def.slug, {
        ...existing,
        title: def.title,
        englishTitle: def.englishTitle,
        sortOrder: def.sortOrder,
      });
      changed = true;
    }
  }

  if (!changed) return { data, changed: false };

  const merged = [...bySlug.values()].sort(compareOccupationsByDisplayOrder);
  return { data: merged, changed: true };
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
    const envelope =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as ManagedOccupationsData)
        : null;
    const fileVersion = envelope?.launchPolicyVersion ?? 0;
    let data = parseManagedData(parsed);

    if (fileVersion < BUSINESS_TAXONOMY_LAUNCH_POLICY_VERSION) {
      data = applyLaunchPolicyToOccupations(data);
      await writeManagedOccupations(data);
      return data;
    }

    const synced = syncOccupationsWithDefaults(data);
    if (synced.changed) {
      await writeManagedOccupations(synced.data);
      return synced.data;
    }

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
    launchPolicyVersion: BUSINESS_TAXONOMY_LAUNCH_POLICY_VERSION,
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
