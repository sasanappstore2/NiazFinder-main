import path from 'node:path';
import { readJson, ROOT } from './shared';

export type GeoTier = 'A' | 'B' | 'C';

export interface GeoTierThresholds {
  tierAMinRealShare: number;
  tierBMinOsmShare: number;
  centroidDriftWarnMeters: number;
  overlapWarnShare: number;
}

export interface GeoTierConfig {
  version: number;
  thresholds: GeoTierThresholds;
  tierA: string[];
  tierB: string[];
  notes?: string;
}

const CONFIG_PATH = path.join(ROOT, 'scripts/geo/tier-config.json');

let cached: GeoTierConfig | null = null;

export function loadTierConfig(): GeoTierConfig {
  if (!cached) {
    cached = readJson<GeoTierConfig>(CONFIG_PATH);
  }
  return cached;
}

export function getTierThresholds(): GeoTierThresholds {
  return loadTierConfig().thresholds;
}

/** Tier A = metros (explicit list). Tier B = has Divar mapping, not A. Tier C = rest. */
export function resolveCityTier(cityId: string, hasDivarMapping: boolean): GeoTier {
  const cfg = loadTierConfig();
  if (cfg.tierA.includes(cityId)) return 'A';
  if (cfg.tierB.includes(cityId)) return 'B';
  if (hasDivarMapping) return 'B';
  return 'C';
}

export function tierQualityRequirement(
  tier: GeoTier,
  shares: { divar: number; osm: number; synthetic: number; manual: number; total: number }
): { ok: boolean; message?: string } {
  if (shares.total === 0) return { ok: false, message: 'no neighborhoods' };
  const realShare = (shares.divar + shares.osm + shares.manual) / shares.total;
  const osmShare = (shares.osm + shares.divar) / shares.total;
  const thresholds = getTierThresholds();

  if (tier === 'A' && realShare < thresholds.tierAMinRealShare) {
    return {
      ok: false,
      message: `tier A requires >=${Math.round(thresholds.tierAMinRealShare * 100)}% real geo, got ${Math.round(realShare * 100)}%`,
    };
  }
  if (tier === 'B' && osmShare < thresholds.tierBMinOsmShare) {
    return {
      ok: false,
      message: `tier B requires >=${Math.round(thresholds.tierBMinOsmShare * 100)}% osm/divar, got ${Math.round(osmShare * 100)}%`,
    };
  }
  return { ok: true };
}
