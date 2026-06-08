'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import { normalizeMapBbox } from '@/lib/business/map-bbox';

export type BusinessMapPinsQuery = {
  category?: string;
  search?: string;
  verified?: boolean;
  cities?: string;
  provinces?: string;
};

export function useBusinessMapPins(query: BusinessMapPinsQuery) {
  const [pins, setPins] = useState<BusinessMapPin[]>([]);
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
        if (query.verified) params.set('verified', 'true');
        if (query.cities) params.set('cities', query.cities);
        if (query.provinces) params.set('provinces', query.provinces);

        const res = await fetch(`/api/business/map-pins?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }

        const json = (await res.json()) as { pins?: BusinessMapPin[] };
        if (!controller.signal.aborted) {
          setPins(json.pins ?? []);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'unknown';
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useBusinessMapPins]', message);
        }
        setError('\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0646\u0642\u0634\u0647 \u0645\u0648\u0641\u0642 \u0646\u0634\u062f');
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
