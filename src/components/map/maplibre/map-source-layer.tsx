'use client';

import { Layer as MapboxLayer, Source as MapboxSource } from 'react-map-gl/mapbox';
import { Layer as MaplibreLayer, Source as MaplibreSource } from 'react-map-gl/maplibre';
import { useMapEngine } from '@/components/map/MapEngineContext';
import type { ComponentProps } from 'react';

type SourceProps = ComponentProps<typeof MaplibreSource>;
type LayerProps = ComponentProps<typeof MaplibreLayer>;

export function NiazMapSource(props: SourceProps) {
  const engine = useMapEngine();
  if (engine === 'maplibre') return <MaplibreSource {...props} />;
  return <MapboxSource {...(props as ComponentProps<typeof MapboxSource>)} />;
}

export function NiazMapLayer(props: LayerProps) {
  const engine = useMapEngine();
  if (engine === 'maplibre') return <MaplibreLayer {...props} />;
  return <MapboxLayer {...(props as ComponentProps<typeof MapboxLayer>)} />;
}
