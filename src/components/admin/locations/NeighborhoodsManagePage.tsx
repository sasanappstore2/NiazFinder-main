'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Edit3,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AdminBadge,
  AdminDataTable,
  AdminPagination,
  AdminStatTile,
  type AdminColumn,
} from '@/components/admin/ui';
import type { ManagedCity, ManagedNeighborhood } from './types';

const PAGE_SIZE = 30;

type StatusFilter = 'all' | 'active' | 'inactive';

export function NeighborhoodsManagePage({
  city,
  provinceName,
  onBack,
  onEdit,
  onDelete,
  onAdd,
}: {
  city: ManagedCity;
  provinceName: string;
  onBack: () => void;
  onEdit: (neighborhood: ManagedNeighborhood) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const neighborhoods = city.neighborhoods;

  const filtered = useMemo(() => {
    let list = neighborhoods;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (n.nameEn?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter === 'active') list = list.filter((n) => n.isActive);
    if (statusFilter === 'inactive') list = list.filter((n) => !n.isActive);
    return [...list].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa')
    );
  }, [neighborhoods, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = neighborhoods.filter((n) => n.isActive).length;
  const inactiveCount = neighborhoods.length - activeCount;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const columns: AdminColumn<ManagedNeighborhood>[] = [
    {
      id: 'name',
      header: 'نام محله',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-(--color-primaryText)">{row.name}</p>
          {row.nameEn ? (
            <p className="mt-0.5 text-[11px] text-(--color-tertiaryText)" dir="ltr">
              {row.nameEn}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'id',
      header: 'شناسه',
      className: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="font-mono text-xs text-(--color-secondaryText)" dir="ltr">
          {row.id}
        </span>
      ),
    },
    {
      id: 'areas',
      header: 'زیرمحدوده',
      className: 'hidden lg:table-cell',
      cell: (row) => (
        <span className="text-xs text-(--color-secondaryText)">
          {row.areas?.length ? `${row.areas.length.toLocaleString('fa-IR')} مورد` : '—'}
        </span>
      ),
    },
    {
      id: 'order',
      header: 'ترتیب',
      className: 'w-20',
      cell: (row) => (
        <span className="tabular-nums text-(--color-secondaryText)">{row.order}</span>
      ),
    },
    {
      id: 'status',
      header: 'وضعیت',
      className: 'w-28',
      cell: (row) =>
        row.isActive ? (
          <AdminBadge variant="success">فعال</AdminBadge>
        ) : (
          <AdminBadge variant="neutral">غیرفعال</AdminBadge>
        ),
    },
  ];

  return (
    <div className="admin-neighborhoods-page -mx-1 flex min-h-[calc(100dvh-8rem)] flex-col sm:-mx-2">
      <header className="admin-neighborhoods-page__hero shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2 text-(--color-secondaryText) hover:text-(--color-primaryText)"
            onClick={onBack}
          >
            <ArrowRight className="size-4" />
            بازگشت به مکان‌ها
          </Button>
        </div>
        <nav
          aria-label="مسیر"
          className="admin-breadcrumb mt-3 flex flex-wrap items-center gap-1 text-xs text-(--color-tertiaryText)"
        >
          <button type="button" onClick={onBack} className="hover:text-(--color-coloredText)">
            مکان‌ها
          </button>
          <ChevronLeft className="size-3 opacity-40" aria-hidden />
          <span>{provinceName}</span>
          <ChevronLeft className="size-3 opacity-40" aria-hidden />
          <span className="font-medium text-(--color-secondaryText)">{city.name}</span>
        </nav>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="admin-panel__icon">
              <MapPin className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="admin-page-title">محله‌های {city.name}</h1>
              <p className="admin-page-subtitle mt-1">
                استان {provinceName} · شناسه شهر{' '}
                <span dir="ltr" className="font-mono text-[11px]">
                  {city.id}
                </span>
              </p>
            </div>
          </div>
          <Button type="button" className="admin-btn-save shrink-0" onClick={onAdd}>
            <Plus className="size-4" />
            افزودن محله
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AdminStatTile
            label="کل محله‌ها"
            value={neighborhoods.length.toLocaleString('fa-IR')}
            icon={MapPin}
            tone="indigo"
          />
          <AdminStatTile
            label="فعال"
            value={activeCount.toLocaleString('fa-IR')}
            icon={MapPin}
            tone="emerald"
          />
          <AdminStatTile
            label="غیرفعال"
            value={inactiveCount.toLocaleString('fa-IR')}
            icon={MapPin}
            tone="amber"
          />
        </div>
      </header>

      <div className="admin-neighborhoods-page__toolbar mt-5 shrink-0">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-(--color-tertiaryText)" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو نام، شناسه یا نام انگلیسی..."
            className="admin-input h-11 border-0 bg-(--color-inputBg) pr-10 shadow-none ring-0 focus-visible:ring-2 focus-visible:ring-(--color-mainColor)/40"
          />
        </div>
        <div className="admin-filter-tabs" role="tablist" aria-label="فیلتر وضعیت">
          {(
            [
              { id: 'all' as const, label: 'همه', count: neighborhoods.length },
              { id: 'active' as const, label: 'فعال', count: activeCount },
              { id: 'inactive' as const, label: 'غیرفعال', count: inactiveCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`admin-filter-tab ${statusFilter === tab.id ? 'admin-filter-tab--active' : ''}`}
            >
              {tab.label}
              <span className="admin-filter-tab__count">{tab.count.toLocaleString('fa-IR')}</span>
            </button>
          ))}
        </div>
        <p className="hidden text-xs text-(--color-tertiaryText) lg:block">
          {filtered.length.toLocaleString('fa-IR')} نتیجه
        </p>
      </div>

      <div className="admin-neighborhoods-page__table mt-4 min-h-0 flex-1">
        <AdminDataTable
          columns={columns}
          rows={pageRows}
          emptyMessage={
            search.trim() ? 'محله‌ای با این جستجو پیدا نشد' : 'هنوز محله‌ای ثبت نشده'
          }
          onRowClick={onEdit}
          rowActions={(row) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-(--color-navItemBgHover)"
                aria-label={`ویرایش ${row.name}`}
                onClick={() => onEdit(row)}
              >
                <Edit3 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`حذف ${row.name}`}
                onClick={() => onDelete(row.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        />
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

export type NeighborhoodManageContext = {
  city: ManagedCity;
  provinceId: string;
  provinceName: string;
};
