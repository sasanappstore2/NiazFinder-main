'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import { normalizeMapBbox } from '@/lib/map/bbox';

export type NeedMapPinsQuery = {
  category?: string;
  search?: string;
  cities?: string;
  provinces?: string;
  neighborhoods?: string;
  neighborhoodCity?: string;
  budgetMin?: string;
  budgetMax?: string;
  priority?: string;
  hasPhoto?: boolean;
  recent?: string;
};

export function useNeedMapPins(query: NeedMapPinsQuery) {
  const [pins, setPins] = useState<NeedMapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchPins = useCallback(
    async (bbox: { west: number; south: number; east: number; north: number }) => {
      const normalized = normalizeMapBbox(bbox);
      if (!normalized) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('west', String(normalized.west));
        params.set('south', String(normalized.south));
        params.set('east', String(normalized.east));
        params.set('north', String(normalized.north));
        if (query.category) params.set('category', query.category);
        if (query.search?.trim()) params.set('search', query.search.trim());
        if (query.cities) params.set('cities', query.cities);
        if (query.provinces) params.set('provinces', query.provinces);
        if (query.neighborhoods) params.set('neighborhoods', query.neighborhoods);
        if (query.neighborhoodCity) params.set('neighborhoodCity', query.neighborhoodCity);
        if (query.budgetMin) params.set('budgetMin', query.budgetMin);
        if (query.budgetMax) params.set('budgetMax', query.budgetMax);
        if (query.priority) params.set('priority', query.priority);
        if (query.hasPhoto) params.set('has-photo', 'true');
        if (query.recent) params.set('recent', query.recent);

        const res = await fetch(`/api/requests/map-pins?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }

        const json = (await res.json()) as { pins?: NeedMapPin[] };
        if (!controller.signal.aborted) {
          setPins(json.pins ?? []);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useNeedMapPins]', err);
        }
        setError('بارگذاری نقشه موفق نشد');
        setPins([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
     
    [queryKey]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { pins, loading, error, fetchPins };
}
