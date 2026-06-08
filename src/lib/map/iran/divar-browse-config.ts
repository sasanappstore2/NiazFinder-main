import { resolveMapViewportScope } from '@/lib/business/map-viewport-scope';
import { IRAN_MAP_MAX_BOUNDS } from '@/lib/map/iran-bounds';
import {
  IRAN_DIVAR_BROWSE_MAX_ZOOM,
  IRAN_DIVAR_NATIONAL_MIN_ZOOM,
} from '@/lib/map/iran/vector-bounds';

export function resolveIranDivarBrowseConfig(
  citySlugs: string[],
  provinceSlugs: string[] = []
) {
  const scope = resolveMapViewportScope(citySlugs, provinceSlugs);

  return {
    center: scope.center,
    viewportBounds: scope.bounds,
    scopeKind: scope.kind,
    provinceIds: scope.provinceIds,
    citySlugs: scope.citySlugs,
    maxBounds: IRAN_MAP_MAX_BOUNDS,
    minZoom: IRAN_DIVAR_NATIONAL_MIN_ZOOM,
    maxZoom: IRAN_DIVAR_BROWSE_MAX_ZOOM,
    clusterMaxZoom: IRAN_DIVAR_BROWSE_MAX_ZOOM,
  };
}
