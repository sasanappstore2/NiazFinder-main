'use client';

import { createContext, useContext } from 'react';

export type MapEngine = 'mapbox' | 'maplibre';

export const MapEngineContext = createContext<MapEngine>('maplibre');

export function useMapEngine(): MapEngine {
  return useContext(MapEngineContext);
}
