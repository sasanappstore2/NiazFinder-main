'use client';

import { Popup as MapboxPopup } from 'react-map-gl/mapbox';
import { Popup as MaplibrePopup } from 'react-map-gl/maplibre';
import { useMapEngine } from '@/components/map/MapEngineContext';
import type { ComponentProps } from 'react';

type PopupProps = ComponentProps<typeof MaplibrePopup>;

export function NiazMapPopup(props: PopupProps) {
  const engine = useMapEngine();
  if (engine === 'maplibre') return <MaplibrePopup {...props} />;
  return <MapboxPopup {...(props as ComponentProps<typeof MapboxPopup>)} />;
}
