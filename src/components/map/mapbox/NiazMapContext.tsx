'use client';

import { createContext, useContext } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

export const NiazMapRefContext = createContext<React.RefObject<MapRef | null> | null>(null);

export function useNiazMapRef(): React.RefObject<MapRef | null> {
  const ctx = useContext(NiazMapRefContext);
  if (!ctx) {
    throw new Error('useNiazMapRef must be used inside NiazMapCore');
  }
  return ctx;
}
