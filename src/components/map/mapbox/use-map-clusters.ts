'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Supercluster from 'supercluster';
import type { MapRef } from 'react-map-gl/mapbox';
import {
  BROWSE_CLUSTER_MAX_ZOOM,
  BROWSE_CLUSTER_RADIUS,
} from '@/lib/map/cluster-config';

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
};

export type ClusterFeature<T extends MapPoint> = Supercluster.PointFeature<T & {
  cluster?: boolean;
  point_count?: number;
}>;

export function useMapClusters<T extends MapPoint>(
  mapRef: React.RefObject<MapRef | null>,
  points: T[],
  opts?: { radius?: number; maxZoom?: number }
) {
  const [clusters, setClusters] = useState<ClusterFeature<T>[]>([]);
  const radius = opts?.radius ?? BROWSE_CLUSTER_RADIUS;
  const maxZoom = opts?.maxZoom ?? BROWSE_CLUSTER_MAX_ZOOM;

  const index = useMemo(() => {
    const sc = new Supercluster<T>({ radius, maxZoom });
    sc.load(
      points.map((p) => ({
        type: 'Feature',
        properties: p,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      }))
    );
    return sc;
  }, [points, radius, maxZoom]);

  const refresh = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    const zoom = map.getZoom();
    if (!b || !Number.isFinite(zoom)) return;
    setClusters(
      index.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.floor(zoom)
      ) as ClusterFeature<T>[]
    );
  }, [index, mapRef]);

  useEffect(() => {
    refresh();
  }, [refresh, points]);

  return { clusters, refresh, index };
}
