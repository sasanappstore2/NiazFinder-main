'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { IntakeMapAreaCircleOverlay } from '@/components/map/mapbox/IntakeMapAreaCircleOverlay';
import { NiazMapIntakeAreaFrame } from '@/components/map/mapbox/NiazMapIntakeAreaFrame';
import { NiazMapIntakeCenterSync } from '@/components/map/mapbox/NiazMapIntakeCenterSync';
import { resolveMapCenterFromCityLabel } from '@/lib/map/default-center';
import {
  INTAKE_AREA_RADIUS_DEFAULT_M,
  intakeAreaFromBbox,
  intakeZoomForRadiusM,
} from '@/lib/map/intake-area-circle';
import {
  resolveIntakeCitySlug,
  resolveIntakeMapFrameBounds,
} from '@/lib/need-intake/intake-map-viewport';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import {
  lookupManagedNeighborhoodBySlug,
  matchManagedNeighborhood,
} from '@/lib/neighborhoods/match-managed-neighborhood';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import { cn } from '@/lib/utils';

const DEFAULT_HINT =
  '\u0645\u062d\u0644\u0647 \u0627\u0646\u062a\u062e\u0627\u0628 \u0634\u062f\u061f \u0646\u0642\u0634\u0647 \u0631\u0627 \u0628\u06a9\u0634\u06cc\u062f \u062a\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0642\u06cc\u0642 \u0631\u0627 \u062a\u0639\u06cc\u06cc\u0646 \u06a9\u0646\u06cc\u062f \u2014 \u0628\u0627 \u0632\u0648\u0645 \u0641\u0642\u0637 \u0628\u0648\u0632 \u0645\u062d\u062f\u0648\u062f\u0647 \u0628\u0632\u0631\u06af\u062a\u0631 \u0645\u06cc\u200c\u0634\u0648\u062f.';

const DISAMBIGUATION_PROMPT =
  '\u0627\u06cc\u0646 \u0646\u0627\u0645 \u062f\u0631 \u0686\u0646\u062f \u0646\u0642\u0637\u0647\u200c\u06cc \u0634\u0647\u0631 \u0648\u062c\u0648\u062f \u062f\u0627\u0631\u062f \u2014 \u0645\u062d\u0644\u0647\u200c\u06cc \u0645\u062f\u0646\u0638\u0631 \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f:';

export function NeedMapPinPicker({
  city,
  categorySlug: _categorySlug,
  lat,
  lng,
  onChange,
  className,
  neighborhoodDisambiguation,
  neighborhoodSlug,
  neighborhoodName,
  neighborhoods = [],
}: {
  city: string;
  categorySlug?: string | null;
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  className?: string;
  neighborhoodDisambiguation?: {
    options: Array<{ value: string; label: string }>;
    selectedValue?: string;
    onSelect: (value: string) => void;
  };
  neighborhoodSlug?: string | null;
  neighborhoodName?: string | null;
  neighborhoods?: ManagedNeighborhood[];
}) {
  const cityCenter = useMemo(() => resolveMapCenterFromCityLabel(city), [city]);
  const citySlug = useMemo(() => resolveIntakeCitySlug(city), [city]);
  const selectedNeighborhood = useMemo(() => {
    const slug = neighborhoodSlug?.trim();
    if (slug) {
      return lookupManagedNeighborhoodBySlug(neighborhoods, slug);
    }
    const name = neighborhoodName?.trim();
    if (name) {
      return (
        neighborhoods.find((n) => n.name === name) ??
        matchManagedNeighborhood(neighborhoods, name, city)
      );
    }
    return null;
  }, [city, neighborhoodName, neighborhoodSlug, neighborhoods]);

  const mapFrame = useMemo(
    () => resolveIntakeMapFrameBounds(city, selectedNeighborhood),
    [city, selectedNeighborhood]
  );

  const areaSelection = useMemo(() => {
    const centroid = selectedNeighborhood?.centroid;
    const center = centroid ?? { lat: cityCenter.lat, lng: cityCenter.lng };
    const bbox = selectedNeighborhood?.bbox ?? mapFrame.neighborhoodBounds;
    if (bbox) {
      return intakeAreaFromBbox(bbox, center);
    }
    return {
      lat: center.lat,
      lng: center.lng,
      radiusM: INTAKE_AREA_RADIUS_DEFAULT_M,
    };
  }, [
    cityCenter.lat,
    cityCenter.lng,
    mapFrame.neighborhoodBounds,
    selectedNeighborhood?.bbox,
    selectedNeighborhood?.centroid,
  ]);

  const mapFrameKey = `${city}-${selectedNeighborhood?.id ?? 'city'}`;

  const mapCenter = useMemo(() => {
    if (selectedNeighborhood?.centroid) {
      return { lat: areaSelection.lat, lng: areaSelection.lng };
    }
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return { lat: cityCenter.lat, lng: cityCenter.lng };
  }, [
    areaSelection.lat,
    areaSelection.lng,
    cityCenter.lat,
    cityCenter.lng,
    lat,
    lng,
    selectedNeighborhood?.centroid,
  ]);

  const mapZoom = useMemo(() => {
    if (selectedNeighborhood?.centroid) {
      return intakeZoomForRadiusM(mapCenter.lat, areaSelection.radiusM, {
        width: 400,
        height: 300,
      });
    }
    return mapFrame.center.zoom;
  }, [
    areaSelection.radiusM,
    mapCenter.lat,
    mapFrame.center.zoom,
    selectedNeighborhood?.centroid,
  ]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleLocationChange = useCallback((coords: { lat: number; lng: number }) => {
    onChangeRef.current(coords);
  }, []);

  useEffect(() => {
    const centroid = selectedNeighborhood?.centroid;
    if (!centroid || !Number.isFinite(centroid.lat) || !Number.isFinite(centroid.lng)) return;
    onChangeRef.current({ lat: centroid.lat, lng: centroid.lng });
  }, [
    selectedNeighborhood?.id,
    selectedNeighborhood?.centroid?.lat,
    selectedNeighborhood?.centroid?.lng,
  ]);

  if (!city.trim()) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {neighborhoodDisambiguation && neighborhoodDisambiguation.options.length >= 2 ? (
        <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {DISAMBIGUATION_PROMPT}
          </p>
          <SuggestionChips
            options={neighborhoodDisambiguation.options}
            value={neighborhoodDisambiguation.selectedValue}
            onSelect={(v) => {
              const value = typeof v === 'string' ? v : (v[0] ?? '');
              if (value) neighborhoodDisambiguation.onSelect(value);
            }}
          />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{DEFAULT_HINT}</p>
      <div className="business-browse-map intake-map-pin-shell overflow-hidden rounded-xl border border-border/50">
        <NiazMapCore
          key={mapFrameKey}
          center={{
            lat: mapCenter.lat,
            lng: mapCenter.lng,
            zoom: mapZoom,
          }}
          detail="picker"
          className="h-full w-full"
          citySlugs={citySlug ? [citySlug] : []}
          overlay={<IntakeMapAreaCircleOverlay />}
        >
          <NiazMapIntakeAreaFrame
            center={{ lat: mapCenter.lat, lng: mapCenter.lng }}
            radiusM={areaSelection.radiusM}
            frameKey={mapFrameKey}
            onFramed={handleLocationChange}
          />
          <NiazMapIntakeCenterSync onCenterChange={handleLocationChange} />
        </NiazMapCore>
      </div>
    </div>
  );
}
