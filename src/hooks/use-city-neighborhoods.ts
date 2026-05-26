'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

export function useCityNeighborhoods(cityId: string | null | undefined) {
  const [neighborhoods, setNeighborhoods] = useState<ManagedNeighborhood[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!cityId) {
      setNeighborhoods([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/locations/neighborhoods?cityId=${encodeURIComponent(cityId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { neighborhoods?: ManagedNeighborhood[] } | null) => {
        if (cancelled) return;
        setNeighborhoods(data?.neighborhoods ?? []);
      })
      .catch(() => {
        if (!cancelled) setNeighborhoods([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const byId = useMemo(() => {
    const map = new Map<string, ManagedNeighborhood>();
    for (const n of neighborhoods) map.set(n.id, n);
    return map;
  }, [neighborhoods]);

  return { neighborhoods, byId, isLoading, hasNeighborhoods: neighborhoods.length > 0 };
}
