export type DateRangePreset = 'today' | '7d' | '28d' | '90d' | 'custom';

export type ParsedDateRange = {
  from: Date;
  to: Date;
  preset: DateRangePreset;
  compareFrom?: Date;
  compareTo?: Date;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function parseDateRange(
  searchParams: URLSearchParams,
  maxDays = 90
): ParsedDateRange {
  const preset = (searchParams.get('preset') ?? '28d') as DateRangePreset;
  const compare = searchParams.get('compare') === '1';
  const now = new Date();
  const to = endOfDay(now);

  let from: Date;
  if (preset === 'today') {
    from = startOfDay(now);
  } else if (preset === 'custom') {
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    from = fromStr ? startOfDay(new Date(fromStr)) : startOfDay(new Date(now.getTime() - 27 * 86400000));
    const customTo = toStr ? endOfDay(new Date(toStr)) : to;
    const diffDays = Math.ceil((customTo.getTime() - from.getTime()) / 86400000);
    if (diffDays > maxDays) {
      from = new Date(customTo.getTime() - (maxDays - 1) * 86400000);
    }
    return buildRange(from, customTo, preset, compare);
  } else {
    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 28;
    from = startOfDay(new Date(now.getTime() - (days - 1) * 86400000));
  }

  return buildRange(from, to, preset, compare);
}

function buildRange(
  from: Date,
  to: Date,
  preset: DateRangePreset,
  compare: boolean
): ParsedDateRange {
  const spanMs = to.getTime() - from.getTime();
  const result: ParsedDateRange = { from, to, preset };
  if (compare) {
    result.compareTo = new Date(from.getTime() - 1);
    result.compareFrom = new Date(from.getTime() - spanMs - 1);
  }
  return result;
}

export type CountRow = { key: string; label: string; value: number };

export function groupByField<T>(
  rows: T[],
  keyFn: (row: T) => string,
  labelFn?: (key: string) => string
): CountRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || '(not set)';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({
      key,
      label: labelFn ? labelFn(key) : key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
