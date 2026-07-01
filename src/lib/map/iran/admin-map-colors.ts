import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';

export type IranAdminMapColors = {
  provinceLine: string;
  provinceSelected: string;
  provinceLabel: string;
  provinceLabelSelected: string;
  labelHalo: string;
  cityLabel: string;
  cityLabelSelected: string;
  cityLine: string;
  cityLineSelected: string;
};

/** Site emerald — matches `--primary` / filter buttons. */
export const MAP_EMERALD = {
  dark: { stroke: '#10b981', label: '#6ee7b7' },
  light: { stroke: '#059669', label: '#047857' },
} as const;

const DARK: IranAdminMapColors = {
  provinceLine: '#c5d0dc',
  provinceSelected: MAP_EMERALD.dark.stroke,
  provinceLabel: '#e8edf3',
  provinceLabelSelected: MAP_EMERALD.dark.label,
  labelHalo: '#181b22',
  cityLabel: '#dce3ed',
  cityLabelSelected: '#f0fdf4',
  cityLine: '#9aa8b8',
  cityLineSelected: MAP_EMERALD.dark.stroke,
};

const LIGHT: IranAdminMapColors = {
  provinceLine: '#94a3b8',
  provinceSelected: MAP_EMERALD.light.stroke,
  provinceLabel: '#1e293b',
  provinceLabelSelected: MAP_EMERALD.light.label,
  labelHalo: '#f8fafc',
  cityLabel: '#334155',
  cityLabelSelected: '#064e3b',
  cityLine: '#94a3b8',
  cityLineSelected: MAP_EMERALD.light.stroke,
};

export function resolveIranAdminMapColors(theme: BusinessMapThemeMode): IranAdminMapColors {
  return theme === 'light' ? LIGHT : DARK;
}
