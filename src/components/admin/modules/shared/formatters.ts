export function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString('fa-IR');
}

export function formatPercent(value: number | undefined) {
  return `${formatNumber(Math.round(value ?? 0))}٪`;
}

export function formatCompactNumber(value: number | undefined) {
  return new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function ratio(part: number | undefined, total: number | undefined) {
  if (!part || !total) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

export function formatUpdatedAt(value: string | undefined) {
  if (!value) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value: string | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
