'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { NiazMapResizeFix } from '@/components/map/mapbox/NiazMapResizeFix';
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
import { cn } from '@/lib/utils';

const DEFAULT_HINT =
  '\u0645\u062d\u0644\u0647 \u0627\u0646\u062a\u062e\u0627\u0628 \u0634\u062f\u061f \u0646\u0642\u0634\u0647 \u0631\u0627 \u0628\u06a9\u0634\u06cc\u062f \u062a\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0642\u06cc\u0642 \u0631\u0627 \u062a\u0639\u06cc\u06cc\u0646 \u06a9\u0646\u06cc\u062f \u2014 \u0628\u0627 \u0632\u0648\u0645 \u0641\u0642\u0637 \u0628\u0648\u0632 \u0645\u062d\u062f\u0648\u062f\u0647 \u0628\u0632\u0631\u06af\u062a\u0631 \u0645\u06cc\u200c\u0634\u0648\u062f.';

/** Resize map when accordion/shell dimensions change (e.g. details open). */
function IntakeMapPinShellResizeFix({
  shellRef,
}: {
  shellRef: RefObject<HTMLDivElement | null>;
}) {
  const mapRef = useNiazMapRef();

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const resize = () => {
      try {
        mapRef.current?.getMap()?.resize();
      } catch {
        // Map may be tearing down.
      }
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(shell);
    resize();

    return () => observer.disconnect();
  }, [shellRef, mapRef]);

  return null;
}

export function NeedMapPinPicker({
  city,
  categorySlug: _categorySlug,
  lat,
  lng,
  onChange,
  className,
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
  neighborhoodSlug?: string | null;
  neighborhoodName?: string | null;
  neighborhoods?: ManagedNeighborhood[];
}) {
  const shellRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleLocationChange = useCallback((coords: { lat: number; lng: number }) => {
    onChangeRef.current(coords);
  }, []);

  useEffect(() => {
    const centroid = selectedNeighborhood?.centroid;
    if (centroid && Number.isFinite(centroid.lat) && Number.isFinite(centroid.lng)) {
      onChangeRef.current({ lat: centroid.lat, lng: centroid.lng });
      return;
    }
    if (Number.isFinite(mapCenter.lat) && Number.isFinite(mapCenter.lng)) {
      onChangeRef.current({ lat: mapCenter.lat, lng: mapCenter.lng });
    }
  }, [
    mapCenter.lat,
    mapCenter.lng,
    selectedNeighborhood?.id,
    selectedNeighborhood?.centroid?.lat,
    selectedNeighborhood?.centroid?.lng,
  ]);

  if (!city.trim()) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">{DEFAULT_HINT}</p>
      <div
        ref={shellRef}
        className="business-browse-map intake-map-pin-shell overflow-hidden rounded-xl border border-border/50"
      >
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
          <NiazMapResizeFix />
          <IntakeMapPinShellResizeFix shellRef={shellRef} />
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
