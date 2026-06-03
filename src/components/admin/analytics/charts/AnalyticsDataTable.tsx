'use client';

import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function rowNumericValue(row: object): number {
  const r = row as { value?: number; sessions?: number; views?: number };
  return Number(r.value ?? r.sessions ?? r.views ?? 0);
}

export type AnalyticsTableColumn<T extends object> = {
  key: string;
  label?: string;
  header?: string;
  className?: string;
  align?: 'right' | 'left';
  sortValue?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
};

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsDataTable<T extends object>({
  columns,
  rows,
  rowKey,
  searchKeys,
  exportFilename,
  showShare,
  totalForShare,
}: {
  columns: AnalyticsTableColumn<T>[];
  rows: T[];
  rowKey?: (row: T) => string;
  searchKeys?: string[];
  exportFilename?: string;
  showShare?: boolean;
  totalForShare?: number;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const cols = useMemo(
    () => columns.map((c) => ({ ...c, label: c.label ?? c.header ?? c.key })),
    [columns]
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (query.trim() && searchKeys?.length) {
      const q = query.trim().toLowerCase();
      list = list.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      const col = cols.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        list = [...list].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        });
      } else {
        list = [...list].sort((a, b) => {
          const av = a[sortKey];
          const bv = b[sortKey];
          const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return list;
  }, [rows, query, searchKeys, sortKey, sortDir, cols]);

  const total = totalForShare ?? rows.reduce((s, r) => s + rowNumericValue(r), 0);

  const toggleSort = (key: string, hasSort: boolean) => {
    if (!hasSort) return;
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    if (!exportFilename) return;
    const headers = cols.map((c) => c.label!);
    const csvRows = filtered.map((row) =>
      cols.map((c) => {
        if (c.render) return String(c.render(row) ?? '');
        return String(row[c.key] ?? '');
      })
    );
    downloadCsv(exportFilename, headers, csvRows);
  };

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-(--color-secondaryText)">ردیفی یافت نشد</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {searchKeys?.length ? (
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-(--color-tertiaryText)" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو…"
              className="pr-9"
            />
          </div>
        ) : null}
        {exportFilename ? (
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="size-4" />
            CSV
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-(--color-mainBorder)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-mainBorder) bg-muted/40 text-right">
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={cn('p-3', c.className, c.sortValue && 'cursor-pointer select-none')}
                  onClick={() => toggleSort(c.key, Boolean(c.sortValue))}
                >
                  {c.label}
                  {sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null}
                </th>
              ))}
              {showShare ? <th className="p-3">سهم</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                className="border-b border-(--color-mainBorder)/60"
              >
                {cols.map((c) => (
                  <td key={c.key} className={cn('p-3', c.className)}>
                    {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                  </td>
                ))}
                {showShare ? (
                  <td className="p-3 tabular-nums text-(--color-secondaryText)">
                    {total > 0
                      ? `${((rowNumericValue(row) / total) * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`
                      : '—'}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
