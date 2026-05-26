'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { AdminEmptyState, AdminTableSkeleton } from './AdminSkeleton';
import { Button } from '@/components/ui/button';

export type AdminColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
};

export function AdminDataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  sortKey,
  sortDir,
  onSort,
  emptyMessage,
  rowActions,
  onRowClick,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (isLoading) return <AdminTableSkeleton />;

  if (rows.length === 0) {
    return <AdminEmptyState title={emptyMessage ?? 'رکوردی یافت نشد'} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-(--color-mainBorder) bg-(--color-tableHeaderBg)">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`px-4 py-3 text-right text-xs font-semibold text-(--color-navSectionTitle) ${col.className ?? ''}`}
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-(--color-coloredText)"
                    onClick={() => onSort(col.id)}
                  >
                    {col.header}
                    {sortKey === col.id ? (
                      sortDir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {rowActions && <th scope="col" className="w-12 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-(--color-mainBorder) transition-colors last:border-0 hover:bg-(--color-tableRowBgHover) ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.id} className={`px-4 py-3.5 text-(--color-tableCellText) ${col.className ?? ''}`}>
                  {col.cell(row)}
                </td>
              ))}
              {rowActions && <td className="px-4 py-3.5">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  onPageChange,
  total,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total?: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-(--color-mainBorder) px-4 py-3 sm:flex-row">
      {total !== undefined && (
        <p className="text-xs text-(--color-secondaryText)">
          {total.toLocaleString('fa-IR')} رکورد
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          قبلی
        </Button>
        <span className="min-w-20 text-center text-sm text-(--color-secondaryText)">
          {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          بعدی
        </Button>
      </div>
    </div>
  );
}
