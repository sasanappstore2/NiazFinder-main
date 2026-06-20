'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { AdminEmptyState, AdminTableSkeleton } from './AdminSkeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AdminColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hide field label on mobile card stack (e.g. action-only columns). */
  hideOnMobile?: boolean;
};

function DefaultMobileCard<T extends { id: string }>({
  row,
  columns,
  rowActions,
  onRowClick,
  selectable,
  selectedIds,
  onSelectionChange,
}: {
  row: T;
  columns: AdminColumn<T>[];
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}) {
  const visibleColumns = columns.filter((col) => !col.hideOnMobile);

  return (
    <div
      className={cn(
        'rounded-lg border border-(--color-mainBorder) bg-(--color-tableRowBg, transparent) p-4',
        onRowClick && 'cursor-pointer hover:bg-(--color-tableRowBgHover)'
      )}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      role={onRowClick ? 'button' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      onKeyDown={
        onRowClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(row);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        {selectable && onSelectionChange && selectedIds ? (
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={selectedIds.has(row.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => {
              const next = new Set(selectedIds);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              onSelectionChange(next);
            }}
          />
        ) : null}
        <dl className="min-w-0 flex-1 space-y-2">
          {visibleColumns.map((col) => (
            <div key={col.id} className="min-w-0">
              <dt className="text-caption font-medium text-(--color-navSectionTitle)">{col.header}</dt>
              <dd className="mt-0.5 overflow-guard text-sm text-(--color-tableCellText)">{col.cell(row)}</dd>
            </div>
          ))}
        </dl>
        {rowActions ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {rowActions(row)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  selectable,
  selectedIds,
  onSelectionChange,
  mobileCardRender,
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
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  mobileCardRender?: (row: T) => ReactNode;
}) {
  if (isLoading) return <AdminTableSkeleton />;

  if (rows.length === 0) {
    return <AdminEmptyState title={emptyMessage ?? 'رکوردی یافت نشد'} />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) =>
          mobileCardRender ? (
            <div key={row.id}>{mobileCardRender(row)}</div>
          ) : (
            <DefaultMobileCard
              key={row.id}
              row={row}
              columns={columns}
              rowActions={rowActions}
              onRowClick={onRowClick}
              selectable={selectable}
              selectedIds={selectedIds}
              onSelectionChange={onSelectionChange}
            />
          )
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-(--color-mainBorder) bg-(--color-tableHeaderBg)">
              {selectable && <th scope="col" className="w-10 px-4 py-3" />}
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
                {selectable && onSelectionChange && selectedIds ? (
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(row.id)) next.delete(row.id);
                        else next.add(row.id);
                        onSelectionChange(next);
                      }}
                    />
                  </td>
                ) : selectable ? (
                  <td className="px-4 py-3.5" />
                ) : null}
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
    </>
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
    <div className="flex flex-col items-center justify-between gap-3 border-t border-(--color-mainBorder) px-4 py-3 md:flex-row">
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
