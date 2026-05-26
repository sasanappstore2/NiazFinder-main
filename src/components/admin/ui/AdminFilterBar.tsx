'use client';

import type { ReactNode } from 'react';
import { Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'جستجو...',
  filters,
  onExport,
  actions,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  onExport?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-(--color-mainBorder) p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-(--color-secondaryText)" />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="admin-input h-10 pr-10"
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onExport && (
          <Button variant="outline" size="sm" className="h-9 gap-2 border-(--color-mainBorder)" onClick={onExport}>
            <Download className="size-4" />
            <span className="hidden sm:inline">خروجی</span>
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
