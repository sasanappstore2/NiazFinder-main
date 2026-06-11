import { resolveMapViewportScope } from '@/lib/business/map-viewport-scope';
import { IRAN_MAP_MAX_BOUNDS } from '@/lib/map/iran-bounds';
import {
  IRAN_DIVAR_BROWSE_MAX_ZOOM,
  IRAN_DIVAR_CITY_MIN_ZOOM,
  IRAN_DIVAR_NATIONAL_MIN_ZOOM,
} from '@/lib/map/iran/vector-bounds';

export function resolveIranDivarBrowseConfig(
  citySlugs: string[],
  provinceSlugs: string[] = []
) {
  const scope = resolveMapViewportScope(citySlugs, provinceSlugs);

  let maxBounds: [[number, number], [number, number]] = IRAN_MAP_MAX_BOUNDS;
  if (scope.kind === 'city' && scope.bounds) {
    maxBounds = [
      [scope.bounds.west - 0.04, scope.bounds.south - 0.03],
      [scope.bounds.east + 0.04, scope.bounds.north + 0.03],
    ];
  } else if (scope.kind === 'province' && scope.bounds) {
    const latPad = (scope.bounds.north - scope.bounds.south) * 0.06;
    const lngPad = (scope.bounds.east - scope.bounds.west) * 0.06;
    maxBounds = [
      [scope.bounds.west - lngPad, scope.bounds.south - latPad],
      [scope.bounds.east + lngPad, scope.bounds.north + latPad],
    ];
  }

  return {
    center: scope.center,
    viewportBounds: scope.bounds,
    scopeKind: scope.kind,
    provinceIds: scope.provinceIds,
    citySlugs: scope.citySlugs,
    maxBounds,
    minZoom:
      scope.kind === 'city'
        ? IRAN_DIVAR_CITY_MIN_ZOOM
        : IRAN_DIVAR_NATIONAL_MIN_ZOOM,
    maxZoom: IRAN_DIVAR_BROWSE_MAX_ZOOM,
    clusterMaxZoom: IRAN_DIVAR_BROWSE_MAX_ZOOM,
  };
}
