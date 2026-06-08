'use client';

import { Marker as MapboxMarker } from 'react-map-gl/mapbox';
import { Marker as MaplibreMarker } from 'react-map-gl/maplibre';
import { useMapEngine } from '@/components/map/MapEngineContext';
import type { ComponentProps } from 'react';

type MarkerProps = ComponentProps<typeof MaplibreMarker>;

export function NiazMapMarker(props: MarkerProps) {
  const engine = useMapEngine();
  if (engine === 'maplibre') return <MaplibreMarker {...props} />;
  return <MapboxMarker {...(props as ComponentProps<typeof MapboxMarker>)} />;
}
