import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

export type IranDivarPalette = {
  void: string;
  land: string;
  water: string;
  waterway: string;
  roadMotorway: string;
  roadPrimary: string;
  roadSecondary: string;
  roadTertiary: string;
  roadService: string;
  boundary: string;
  park: string;
  landuseCommercial: string;
  landuseResidential: string;
  buildingFill: string;
  buildingOutline: string;
  labelStrong: string;
  labelMid: string;
  labelSoft: string;
  labelMuted: string;
  labelHalo: string;
  waterLabel: string;
};

export const IRAN_DIVAR_PALETTES: Record<BusinessMapThemeMode, IranDivarPalette> = {
  dark: {
    void: '#181b22',
    land: '#1f2430',
    water: '#1a2d42',
    waterway: '#2d455c',
    roadMotorway: '#8a9bb2',
    roadPrimary: '#7a8da3',
    roadSecondary: '#6a7a8f',
    roadTertiary: '#4f5d6e',
    roadService: '#3d4654',
    boundary: '#5a6d82',
    park: '#1c3328',
    landuseCommercial: '#222630',
    landuseResidential: '#1c1f27',
    buildingFill: '#252932',
    buildingOutline: '#2e333d',
    labelStrong: '#e8edf3',
    labelMid: '#dce3ed',
    labelSoft: '#c5cdd8',
    labelMuted: '#b8c2cf',
    labelHalo: '#181b22',
    waterLabel: '#7a9ab8',
  },
  light: {
    void: '#e8ecf2',
    land: '#e0e5ec',
    water: '#9ec8e8',
    waterway: '#7eb5dc',
    roadMotorway: '#7a8799',
    roadPrimary: '#6b7788',
    roadSecondary: '#8a95a5',
    roadTertiary: '#9aa5b3',
    roadService: '#b0b9c5',
    boundary: '#8b98a8',
    park: '#c5dfc5',
    landuseCommercial: '#dde3eb',
    landuseResidential: '#e6eaef',
    buildingFill: '#d8dee6',
    buildingOutline: '#c8d0da',
    labelStrong: '#1e293b',
    labelMid: '#334155',
    labelSoft: '#475569',
    labelMuted: '#64748b',
    labelHalo: '#f8fafc',
    waterLabel: '#2f6f9c',
  },
};

export function resolveIranDivarPalette(theme: BusinessMapThemeMode): IranDivarPalette {
  return IRAN_DIVAR_PALETTES[theme];
}

export function resolveIranDivarVoidColor(theme: BusinessMapThemeMode): string {
  return IRAN_DIVAR_PALETTES[theme].void;
}

export function resolveIranDivarLoadingColor(theme: BusinessMapThemeMode): string {
  return IRAN_DIVAR_PALETTES[theme].void;
}
