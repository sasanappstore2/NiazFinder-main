'use client';

import { createContext, useContext } from 'react';
import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

const IranMapThemeContext = createContext<BusinessMapThemeMode>('dark');

export function IranMapThemeProvider({
  theme,
  children,
}: {
  theme: BusinessMapThemeMode;
  children: React.ReactNode;
}) {
  return <IranMapThemeContext.Provider value={theme}>{children}</IranMapThemeContext.Provider>;
}

export function useIranMapTheme(): BusinessMapThemeMode {
  return useContext(IranMapThemeContext);
}
