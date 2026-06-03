import type { BrandAuraColors } from '@/lib/color/extract-brand-colors';

export type BrandAtmosphereTokens = {
  /** Borders, small accents — faithful logo accent */
  accent: string;
  /** Large-area glows — lower chroma */
  accentSoft: string;
  /** Most vivid logo color — hero aurora */
  vivid: string;
  /** Logo gray / metal */
  neutral: string;
  /** Page wash — very muted neutral */
  neutralSoft: string;
};

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const n = hex.replace('#', '').trim();
  if (n.length !== 6) return null;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = hue / 360;
  const t = (n: number) => {
    let k = n + hk;
    if (k > 1) k -= 1;
    if (k < 1 / 6) return p + (q - p) * 6 * k;
    if (k < 1 / 2) return q;
    if (k < 2 / 3) return p + (q - p) * (2 / 3 - k) * 6;
    return p;
  };
  return {
    r: t(0) * 255,
    g: t(1 / 3) * 255,
    b: t(2 / 3) * 255,
  };
}

function hslHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbHex(r, g, b);
}

/** Pink/magenta fringes from logo anti-aliasing → snap to brand red. */
function canonicalAccentHue(h: number, s: number): number {
  if (s < 0.12) return h;
  if (h >= 265 && h <= 345) return 8;
  if (h >= 345 || h <= 35) return h <= 20 || h >= 345 ? Math.min(h, 18) : 8;
  return h;
}

function normalizeAccentHex(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hue = canonicalAccentHue(h, s);
  const sat = Math.min(0.72, Math.max(0.38, s));
  const light = Math.min(0.52, Math.max(0.32, l));
  return hslHex(hue, sat, light);
}

function normalizeNeutralHex(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  const pull = 0.82;
  return rgbHex(
    avg + (rgb.r - avg) * pull,
    avg + (rgb.g - avg) * pull,
    avg + (rgb.b - avg) * pull
  );
}

function softenAccent(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslHex(h, s * 0.42, Math.min(0.58, l + 0.06));
}

function softenNeutral(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslHex(h, s * 0.25, Math.min(0.72, l + 0.08));
}

/** Hero aurora: same hue as logo, higher chroma. */
function normalizeVividHex(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hue = canonicalAccentHue(h, s);
  const sat = Math.min(0.88, Math.max(0.55, s * 1.08));
  const light = Math.min(0.5, Math.max(0.36, l));
  return hslHex(hue, sat, light);
}

/** Palette tuned for large UI surfaces (not raw logo pixels). */
export function normalizeBrandAtmosphere(
  colors: BrandAuraColors
): BrandAtmosphereTokens {
  const accent = normalizeAccentHex(colors.primary);
  const neutral = normalizeNeutralHex(colors.secondary);
  const vivid = normalizeVividHex(colors.vivid ?? colors.primary);
  return {
    accent,
    accentSoft: softenAccent(accent),
    vivid,
    neutral,
    neutralSoft: softenNeutral(neutral),
  };
}

export function atmosphereToCssVars(
  tokens: BrandAtmosphereTokens
): Record<string, string> {
  return {
    '--brand-aura-a': tokens.accent,
    '--brand-aura-b': tokens.neutral,
    '--brand-accent-soft': tokens.accentSoft,
    '--brand-vivid': tokens.vivid,
    '--brand-neutral-soft': tokens.neutralSoft,
  };
}
