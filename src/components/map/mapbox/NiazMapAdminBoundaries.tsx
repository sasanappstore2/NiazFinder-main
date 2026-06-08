'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection, Polygon } from 'geojson';
import type { FilterSpecification } from 'maplibre-gl';
import { useIranMapTheme } from '@/components/map/iran/IranMapThemeContext';
import { NiazMapLayer, NiazMapSource } from '@/components/map/maplibre/map-source-layer';
import {
  buildCityBoundariesFeatureCollection,
  buildCityLabelsFeatureCollection,
  IRAN_PROVINCE_BOUNDARIES_URL,
  IRAN_PROVINCE_LABELS,
} from '@/lib/map/iran/city-admin-boundaries';
import { resolveIranAdminMapColors } from '@/lib/map/iran/admin-map-colors';
import type { MapViewportScopeKind } from '@/lib/business/map-viewport-scope';
import { IRAN_ADMIN_CITY_MIN_ZOOM, IRAN_MAP_ZOOM } from '@/lib/map/iran/zoom-tiers';

/**
 * Admin borders: province + city outlines only (no fill overlays).
 */
export function NiazMapAdminBoundaries({
  provinceIds,
  citySlugs,
  scopeKind,
}: {
  provinceIds: string[];
  citySlugs: string[];
  scopeKind: MapViewportScopeKind;
}) {
  const theme = useIranMapTheme();
  const colors = useMemo(() => resolveIranAdminMapColors(theme), [theme]);
  const [provincesGeo, setProvincesGeo] = useState<FeatureCollection<Polygon, { id: string; name: string }> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(IRAN_PROVINCE_BOUNDARIES_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setProvincesGeo(data as FeatureCollection<Polygon, { id: string; name: string }>);
        }
      })
      .catch(() => {
        if (!cancelled) setProvincesGeo(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvinceFilter = useMemo((): FilterSpecification => {
    if (provinceIds.length === 0) {
      return ['==', ['get', 'id'], '__none__'];
    }
    return ['in', ['get', 'id'], ['literal', provinceIds]];
  }, [provinceIds]);

  const cityBoundaries = useMemo(
    () =>
      buildCityBoundariesFeatureCollection({
        provinceIds,
        citySlugs,
      }),
    [provinceIds, citySlugs]
  );

  const cityLabels = useMemo(
    () =>
      buildCityLabelsFeatureCollection({
        provinceIds,
        citySlugs,
      }),
    [provinceIds, citySlugs]
  );

  const showCityLabels =
    cityLabels.features.length > 0 &&
    (scopeKind === 'province' || scopeKind === 'city' || provinceIds.length > 0);

  const showCityLines =
    citySlugs.length > 0 || provinceIds.length > 0 || scopeKind === 'city';
  const cityDetailMinZoom =
    scopeKind === 'city'
      ? 0
      : scopeKind === 'province'
        ? IRAN_MAP_ZOOM.URBAN
        : IRAN_ADMIN_CITY_MIN_ZOOM;

  return (
    <>
      {provincesGeo ? (
        <NiazMapSource id="admin-provinces" type="geojson" data={provincesGeo}>
          <NiazMapLayer
            id="admin-province-line"
            type="line"
            paint={{
              'line-color': colors.provinceLine,
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 9, 1, 12, 1.2],
              'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 9, 0.4, 12, 0.3],
            }}
          />
          <NiazMapLayer
            id="admin-province-line-selected"
            type="line"
            filter={selectedProvinceFilter}
            paint={{
              'line-color': colors.provinceSelected,
              'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 9, 1.5, 12, 2],
              'line-opacity': scopeKind === 'city' ? 0.55 : 0.75,
            }}
          />
        </NiazMapSource>
      ) : null}

      <NiazMapSource id="admin-province-labels" type="geojson" data={IRAN_PROVINCE_LABELS}>
        <NiazMapLayer
          id="admin-province-label"
          type="symbol"
          maxzoom={11}
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 7, 11, 10, 11],
            'text-anchor': 'center',
            'text-max-width': 9,
            'text-optional': true,
            'text-padding': 6,
            'text-allow-overlap': false,
          }}
          paint={{
            'text-color':
              provinceIds.length > 0
                ? [
                    'case',
                    ['in', ['get', 'id'], ['literal', provinceIds]],
                    colors.provinceLabelSelected,
                    colors.provinceLabel,
                  ]
                : colors.provinceLabel,
            'text-halo-color': colors.labelHalo,
            'text-halo-width': 1.6,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.95, 9, 0.9, 11, 0],
          }}
        />
      </NiazMapSource>

      {showCityLabels ? (
        <NiazMapSource id="admin-city-labels" type="geojson" data={cityLabels}>
          <NiazMapLayer
            id="admin-city-label"
            type="symbol"
            minzoom={IRAN_MAP_ZOOM.REGIONAL}
            maxzoom={12}
            filter={['==', ['get', 'selected'], false]}
            layout={{
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 9, 12, 11, 13],
              'text-anchor': 'center',
              'text-max-width': 10,
              'text-padding': 4,
              'text-optional': true,
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': colors.cityLabel,
              'text-halo-color': colors.labelHalo,
              'text-halo-width': 1.5,
              'text-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.85, 10, 0.95, 12, 0.7],
            }}
          />
          <NiazMapLayer
            id="admin-city-label-selected"
            type="symbol"
            minzoom={IRAN_MAP_ZOOM.REGIONAL}
            maxzoom={13}
            filter={['==', ['get', 'selected'], true]}
            layout={{
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12, 9, 13, 11, 14],
              'text-anchor': 'center',
              'text-max-width': 10,
              'text-padding': 2,
              'text-optional': false,
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': colors.cityLabelSelected,
              'text-halo-color': colors.labelHalo,
              'text-halo-width': 1.8,
              'text-opacity': 0.95,
            }}
          />
        </NiazMapSource>
      ) : null}

      {showCityLines && cityBoundaries.features.length > 0 ? (
        <NiazMapSource id="admin-cities" type="geojson" data={cityBoundaries}>
          {scopeKind === 'province' ? (
            <NiazMapLayer
              id="admin-city-line"
              type="line"
              minzoom={cityDetailMinZoom}
              paint={{
                'line-color': colors.cityLine,
                'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12, 0.9],
                'line-opacity': 0.4,
              }}
            />
          ) : null}
          <NiazMapLayer
            id="admin-city-line-selected"
            type="line"
            minzoom={cityDetailMinZoom}
            filter={['==', ['get', 'selected'], true]}
            paint={{
              'line-color': colors.cityLineSelected,
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 13, 1.8, 15, 2.2],
              'line-opacity': 0.7,
            }}
          />
        </NiazMapSource>
      ) : null}
    </>
  );
}
