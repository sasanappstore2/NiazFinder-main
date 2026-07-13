/**
 * scalar-geo comparison strategy — §3's comparator audit deliberately keeps location as
 * string/substring comparison, not ontology-based (no location ontology provider exists).
 */
import type { ScalarGeoValue } from '../../types';
import { SHAPE_REASON_CODES } from '../../registry/reason-codes';
import type { StrategyOutcome } from './types';

export function geoValuesMatch(a: Pick<ScalarGeoValue, 'raw'>, b: Pick<ScalarGeoValue, 'raw'>): boolean {
  if (a.raw === b.raw) return true;
  return a.raw.includes(b.raw) || b.raw.includes(a.raw);
}

export function compareScalarGeo(a: ScalarGeoValue, b: ScalarGeoValue): StrategyOutcome {
  const matched = geoValuesMatch(a, b);
  return {
    status: matched ? 'match' : 'mismatch',
    relationship: null,
    reasonCode: matched ? SHAPE_REASON_CODES.GEO_MATCH : SHAPE_REASON_CODES.GEO_MISMATCH,
    reasonParams: { aRaw: a.raw, bRaw: b.raw },
  };
}
