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

const DARK: IranAdminMapColors = {
  provinceLine: '#c5d0dc',
  provinceSelected: '#34d399',
  provinceLabel: '#e8edf3',
  provinceLabelSelected: '#a7f3d0',
  labelHalo: '#181b22',
  cityLabel: '#dce3ed',
  cityLabelSelected: '#a7f3d0',
  cityLine: '#9aa8b8',
  cityLineSelected: '#39ff14',
};

const LIGHT: IranAdminMapColors = {
  provinceLine: '#94a3b8',
  provinceSelected: '#059669',
  provinceLabel: '#1e293b',
  provinceLabelSelected: '#047857',
  labelHalo: '#f8fafc',
  cityLabel: '#334155',
  cityLabelSelected: '#059669',
  cityLine: '#94a3b8',
  cityLineSelected: '#10b981',
};

export function resolveIranAdminMapColors(theme: BusinessMapThemeMode): IranAdminMapColors {
  return theme === 'light' ? LIGHT : DARK;
}
