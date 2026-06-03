import type { HeatmapMetric } from '@/lib/geo/types';

const SKY_SCALE = [
  'rgb(241 245 249)',
  'rgb(219 234 254)',
  'rgb(147 197 253)',
  'rgb(59 130 246)',
  'rgb(29 78 216)',
  'rgb(30 58 138)',
];

const AMBER_SCALE = [
  'rgb(241 245 249)',
  'rgb(254 243 199)',
  'rgb(253 230 138)',
  'rgb(251 191 36)',
  'rgb(217 119 6)',
  'rgb(146 64 14)',
];

export function heatColor(
  value: number,
  max: number,
  metric: HeatmapMetric = 'sessions',
  compareDelta?: number | null
): string {
  if (compareDelta != null && compareDelta !== 0) {
    const intensity = Math.min(1, Math.abs(compareDelta) / 50);
    if (compareDelta > 0) return `rgb(${Math.round(34 + (1 - intensity) * 200)} ${Math.round(197 - intensity * 80)} ${Math.round(94 - intensity * 40)})`;
    return `rgb(${Math.round(239 - intensity * 40)} ${Math.round(68 + (1 - intensity) * 100)} ${Math.round(68 + (1 - intensity) * 100)})`;
  }

  if (!max || !value) return 'rgb(226 232 240 / 0.85)';

  const scale = metric === 'bounceRate' ? AMBER_SCALE : SKY_SCALE;
  const t = Math.min(1, value / max);
  const idx = Math.min(scale.length - 1, Math.floor(t * (scale.length - 1)));
  return scale[idx]!;
}

export function formatMetricValue(value: number, metric: HeatmapMetric): string {
  if (metric === 'bounceRate' || metric === 'conversionRate') {
    return `${value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
  }
  return value.toLocaleString('fa-IR');
}
