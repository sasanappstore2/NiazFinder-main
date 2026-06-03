export type BrandAuraColors = {
  /** Main brand accent (e.g. logo red) */
  primary: string;
  /** Neutral / metal gray */
  secondary: string;
  /** Most saturated pixel in logo */
  vivid: string;
};

/** Site primary until logo colors are sampled (always valid in `color-mix`). */
export const BRAND_AURA_FALLBACK: BrandAuraColors = {
  primary: 'oklch(0.55 0.15 165)',
  secondary: 'oklch(0.62 0.12 85)',
  vivid: 'oklch(0.55 0.15 165)',
};

/** Prefer live theme tokens when aura mounts in the browser. */
export function readBrandAuraFromTheme(): BrandAuraColors {
  if (typeof window === 'undefined') return BRAND_AURA_FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--primary').trim();
  const secondary =
    style.getPropertyValue('--chart-2').trim() ||
    style.getPropertyValue('--ring').trim();
  return {
    primary: primary || BRAND_AURA_FALLBACK.primary,
    secondary: secondary || BRAND_AURA_FALLBACK.secondary,
    vivid: primary || BRAND_AURA_FALLBACK.vivid,
  };
}

const CACHE_VERSION = 4;
const cache = new Map<string, BrandAuraColors | null>();

function cacheKey(src: string): string {
  return `${CACHE_VERSION}:${src}`;
}

function rgbHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgbHue(r: number, g: number, b: number): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return Math.round(h * 60);
}

function isRedFamily(hue: number): boolean {
  return hue <= 30 || hue >= 330;
}

/** Strong brand accent — not white/black/gray. */
function chromaticScore(r: number, g: number, b: number): number {
  const sat = saturation(r, g, b);
  const lum = luminance(r, g, b);
  if (lum < 0.14 || lum > 0.86) return 0;
  if (sat < 0.2) return 0;
  const hue = rgbHue(r, g, b);
  let score = sat * (1 - Math.abs(lum - 0.44) * 0.75);
  if (isRedFamily(hue)) score *= 1.45;
  if (hue >= 265 && hue <= 345) score *= 0.2;
  return score;
}

/** Neutral brand tone (gray in logo). */
function grayScore(r: number, g: number, b: number): number {
  const sat = saturation(r, g, b);
  const lum = luminance(r, g, b);
  if (lum < 0.18 || lum > 0.8) return 0;
  if (sat > 0.18) return 0;
  const grayness = 1 - sat * 4;
  const midTone = 1 - Math.abs(lum - 0.5) * 1.1;
  return grayness * Math.max(0, midTone);
}

function pickTopChromatic(
  scored: { hex: string; score: number }[]
): string | null {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  return sorted[0]?.hex ?? null;
}

function pickTopGray(
  scored: { hex: string; score: number }[]
): string | null {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  return sorted[0]?.hex ?? null;
}

function desaturateHex(hex: string, amount = 0.62): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number) => Math.round(c + (lum - c) * amount);
  return rgbHex(mix(r), mix(g), mix(b));
}

/**
 * Sample logo for accent + neutral gray (not anti-alias pink).
 */
export async function extractBrandColorsFromImage(
  src: string
): Promise<BrandAuraColors | null> {
  if (typeof window === 'undefined' || !src?.trim()) return null;
  const key = cacheKey(src);
  if (cache.has(key)) return cache.get(key) ?? null;

  const result = await new Promise<BrandAuraColors | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const chromatic: { hex: string; score: number }[] = [];
        const grays: { hex: string; score: number }[] = [];
        let vividHex: string | null = null;
        let vividSat = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          const a = data[i + 3]!;
          if (a < 90) continue;

          const lum = luminance(r, g, b);
          const sat = saturation(r, g, b);
          if (lum > 0.92 && sat < 0.08) continue;

          const cScore = chromaticScore(r, g, b);
          if (cScore > 0) {
            const hex = rgbHex(r, g, b);
            chromatic.push({ hex, score: cScore });
            if (sat > vividSat && lum >= 0.2 && lum <= 0.78) {
              vividSat = sat;
              vividHex = hex;
            }
          }

          const gScore = grayScore(r, g, b);
          if (gScore > 0) {
            grays.push({ hex: rgbHex(r, g, b), score: gScore });
          }
        }

        const primary = pickTopChromatic(chromatic);
        if (!primary) {
          resolve(null);
          return;
        }

        let secondary = pickTopGray(grays);
        if (!secondary || secondary === primary) {
          secondary = desaturateHex(primary, 0.68);
        }

        resolve({
          primary,
          secondary,
          vivid: vividHex ?? primary,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  cache.set(key, result);
  return result;
}
