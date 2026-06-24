import type { ServiceAreaEntry } from './types';

/**
 * Phase 5 — Service Area System. City / district / neighborhood coverage with
 * strength, plus aggregation helpers for coverage maps and heatmaps.
 */

export interface CoverageSummary {
  cities: Array<{ city: string; areaCount: number; strength: number }>;
  topNeighborhoods: Array<{ label: string; strength: number }>;
  totalAreas: number;
}

export function summarizeCoverage(areas: ServiceAreaEntry[]): CoverageSummary {
  const cityMap = new Map<string, { areaCount: number; strengthSum: number }>();
  const neighborhoods: Array<{ label: string; strength: number }> = [];

  for (const area of areas) {
    const c = cityMap.get(area.city) ?? { areaCount: 0, strengthSum: 0 };
    c.areaCount += 1;
    c.strengthSum += area.strength ?? 3;
    cityMap.set(area.city, c);

    if (area.neighborhood) {
      neighborhoods.push({
        label: `${area.neighborhood}${area.city ? `، ${area.city}` : ''}`,
        strength: area.strength ?? 3,
      });
    }
  }

  const cities = [...cityMap.entries()]
    .map(([city, v]) => ({
      city,
      areaCount: v.areaCount,
      strength: v.areaCount ? Math.round((v.strengthSum / v.areaCount) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.areaCount - a.areaCount);

  const topNeighborhoods = neighborhoods
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);

  return { cities, topNeighborhoods, totalAreas: areas.length };
}
