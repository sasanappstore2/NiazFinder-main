'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { prefetchCityViewportChunk } from '@/lib/map/location-viewport-cache';
import {
  resolveLocationMapViewport,
  resolveLocationMapViewportSync,
  type LocationViewportInput,
} from '@/lib/map/location-viewport-resolver';
import type { LocationMapViewport } from '@/lib/map/location-viewport-types';
import { resolveIntakeCitySlug } from '@/lib/need-intake/intake-map-viewport';

export type LocationViewportStatus = 'idle' | 'loading' | 'ready';

export function useLocationViewport(input: {
  cityLabel?: string | null;
  cityId?: string | null;
  provinceId?: string | null;
  provinceSlug?: string | null;
  neighborhoodId?: string | null;
  neighborhoodName?: string | null;
}): {
  status: LocationViewportStatus;
  viewport: LocationMapViewport;
  cityBounds: BusinessMapBbox | null;
  neighborhoodBounds: BusinessMapBbox | null;
} {
  const citySlug = useMemo(() => {
    if (input.cityId?.trim()) return input.cityId.trim();
    if (input.cityLabel?.trim()) return resolveIntakeCitySlug(input.cityLabel.trim());
    return null;
  }, [input.cityId, input.cityLabel]);

  const neighborhoodId = input.neighborhoodId?.trim() || input.neighborhoodName?.trim() || null;

  const syncViewport = useMemo(() => {
    const resolverInput: LocationViewportInput = {
      cityId: citySlug ?? undefined,
      citySlug: citySlug ?? undefined,
      provinceId: input.provinceId ?? undefined,
      provinceSlug: input.provinceSlug ?? undefined,
    };
    return resolveLocationMapViewportSync(resolverInput);
  }, [citySlug, input.provinceId, input.provinceSlug]);

  const [status, setStatus] = useState<LocationViewportStatus>(
    neighborhoodId && citySlug ? 'loading' : 'ready'
  );
  const [viewport, setViewport] = useState<LocationMapViewport>(syncViewport);

  useEffect(() => {
    if (!citySlug) {
      setViewport(syncViewport);
      setStatus('ready');
      return;
    }

    prefetchCityViewportChunk(citySlug);

    if (!neighborhoodId) {
      setViewport(syncViewport);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    void resolveLocationMapViewport({
      cityId: citySlug,
      citySlug,
      provinceId: input.provinceId ?? undefined,
      provinceSlug: input.provinceSlug ?? undefined,
      neighborhoodId,
    }).then((resolved) => {
      if (cancelled) return;
      setViewport(resolved);
      setStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [citySlug, neighborhoodId, syncViewport, input.provinceId, input.provinceSlug]);

  const cityBounds =
    viewport.scope === 'neighborhood' && citySlug
      ? resolveLocationMapViewportSync({ cityId: citySlug, citySlug }).bounds
      : viewport.scope === 'city'
        ? viewport.bounds
        : null;

  const neighborhoodBounds = viewport.scope === 'neighborhood' ? viewport.bounds : null;

  return { status, viewport, cityBounds, neighborhoodBounds };
}
