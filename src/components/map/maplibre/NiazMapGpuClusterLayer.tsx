'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import type { MapPoint } from '@/components/map/mapbox/use-map-clusters';
import {
  BROWSE_CLUSTER_COLORS,
  BROWSE_CLUSTER_MAX_ZOOM,
  BROWSE_CLUSTER_RADIUS,
  BROWSE_CLUSTER_THRESHOLDS,
} from '@/lib/map/cluster-config';

export type NiazMapGpuClusterLayerProps<T extends MapPoint> = {
  points: T[];
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterColors?: [string, string, string];
  clusterThresholds?: [number, number];
  /** When true, only GPU cluster circles render ? use DOM pins for leaves. */
  clustersOnly?: boolean;
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number
  ) => void;
  onUnclusteredChange?: (pins: T[]) => void;
};

function pointsToGeoJson<T extends MapPoint>(points: T[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      properties: { ...p },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  };
}

function useMapStyleLoaded(map: MapLibreMap | null): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!map) {
      setLoaded(false);
      return;
    }

    const markLoaded = () => {
      if (map.isStyleLoaded()) setLoaded(true);
    };

    if (map.isStyleLoaded()) {
      setLoaded(true);
    } else {
      map.once('load', markLoaded);
      map.once('styledata', markLoaded);
    }

    return () => {
      map.off('load', markLoaded);
      map.off('styledata', markLoaded);
    };
  }, [map]);

  return loaded;
}

function collectUnclusteredPins<T extends MapPoint>(
  map: MapLibreMap,
  sourceId: string,
  points: T[]
): T[] {
  const byId = new Map(points.map((p) => [p.id, p]));
  const features = map.querySourceFeatures(sourceId, {
    filter: ['!', ['has', 'point_count']],
  });
  const seen = new Set<string>();
  const result: T[] = [];

  for (const feature of features) {
    const id = String((feature.properties as T | undefined)?.id ?? '');
    if (!id || seen.has(id)) continue;
    const pin = byId.get(id);
    if (pin) {
      seen.add(id);
      result.push(pin);
    }
  }

  return result;
}

/**
 * Native MapLibre cluster layers (GPU) ? pattern from mapcn MapClusterLayer.
 * Use with DOM pin markers for unclustered leaves when `clustersOnly` is true.
 */
export function NiazMapGpuClusterLayer<T extends MapPoint>({
  points,
  clusterMaxZoom = BROWSE_CLUSTER_MAX_ZOOM,
  clusterRadius = BROWSE_CLUSTER_RADIUS,
  clusterColors = BROWSE_CLUSTER_COLORS,
  clusterThresholds = BROWSE_CLUSTER_THRESHOLDS,
  clustersOnly = true,
  onClusterClick,
  onUnclusteredChange,
}: NiazMapGpuClusterLayerProps<T>) {
  const mapRef = useNiazMapRef();
  const reactId = useId();
  const sourceId = `niaz-cluster-source-${reactId}`;
  const clusterLayerId = `niaz-clusters-${reactId}`;
  const clusterCountLayerId = `niaz-cluster-count-${reactId}`;
  const unclusteredLayerId = `niaz-unclustered-${reactId}`;

  const map = (mapRef.current?.getMap() ?? null) as MapLibreMap | null;
  const isLoaded = useMapStyleLoaded(map);

  const geoJson = useMemo(() => pointsToGeoJson(points), [points]);

  const stylePropsRef = useRef({
    clusterColors,
    clusterThresholds,
    pointColor: BROWSE_CLUSTER_COLORS[0],
  });

  const callbacksRef = useRef({ onClusterClick, onUnclusteredChange, points });
  callbacksRef.current = { onClusterClick, onUnclusteredChange, points };

  // Mount source + layers
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: 'geojson',
      data: geoJson,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    map.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          clusterColors[0],
          clusterThresholds[0],
          clusterColors[1],
          clusterThresholds[1],
          clusterColors[2],
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          clusterThresholds[0],
          28,
          clusterThresholds[1],
          36,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.92,
      },
    });

    map.addLayer({
      id: clusterCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    if (!clustersOnly) {
      map.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': clusterColors[0],
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    return () => {
      try {
        if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
        if (!clustersOnly && map.getLayer(unclusteredLayerId)) {
          map.removeLayer(unclusteredLayerId);
        }
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // map tearing down
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId, clustersOnly]);

  // Sync data
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(geoJson);
  }, [isLoaded, map, geoJson, sourceId]);

  // Sync paint when theme props change
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(clusterLayerId)) return;

    const prev = stylePropsRef.current;
    const colorsChanged =
      prev.clusterColors !== clusterColors || prev.clusterThresholds !== clusterThresholds;

    if (colorsChanged) {
      map.setPaintProperty(clusterLayerId, 'circle-color', [
        'step',
        ['get', 'point_count'],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ]);
      map.setPaintProperty(clusterLayerId, 'circle-radius', [
        'step',
        ['get', 'point_count'],
        20,
        clusterThresholds[0],
        28,
        clusterThresholds[1],
        36,
      ]);
    }

    stylePropsRef.current = { clusterColors, clusterThresholds, pointColor: clusterColors[0] };
  }, [isLoaded, map, clusterLayerId, clusterColors, clusterThresholds]);

  // Report unclustered leaves for DOM pin overlay
  useEffect(() => {
    if (!isLoaded || !map || !clustersOnly || !onUnclusteredChange) return;

    const refresh = () => {
      callbacksRef.current.onUnclusteredChange?.(
        collectUnclusteredPins(map, sourceId, callbacksRef.current.points)
      );
    };

    refresh();
    map.on('moveend', refresh);
    map.on('sourcedata', refresh);

    return () => {
      map.off('moveend', refresh);
      map.off('sourcedata', refresh);
    };
  }, [isLoaded, map, sourceId, clustersOnly, onUnclusteredChange, points]);

  // Click handlers
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClusterClick = async (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
      if (!features.length) return;

      const feature = features[0]!;
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (callbacksRef.current.onClusterClick) {
        callbacksRef.current.onClusterClick(clusterId, coordinates, pointCount);
      } else {
        const source = map.getSource(sourceId) as unknown as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: coordinates, zoom, duration: 300 });
      }
    };

    const handlePointClick = (_e: MapLayerMouseEvent) => {
      if (clustersOnly) return;
    };

    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', clusterLayerId, handleClusterClick);
    if (!clustersOnly) {
      map.on('click', unclusteredLayerId, handlePointClick);
    }
    map.on('mouseenter', clusterLayerId, handleMouseEnterCluster);
    map.on('mouseleave', clusterLayerId, handleMouseLeaveCluster);

    return () => {
      map.off('click', clusterLayerId, handleClusterClick);
      if (!clustersOnly) {
        map.off('click', unclusteredLayerId, handlePointClick);
      }
      map.off('mouseenter', clusterLayerId, handleMouseEnterCluster);
      map.off('mouseleave', clusterLayerId, handleMouseLeaveCluster);
      map.getCanvas().style.cursor = '';
    };
  }, [isLoaded, map, clusterLayerId, unclusteredLayerId, sourceId, clustersOnly]);

  return null;
}
