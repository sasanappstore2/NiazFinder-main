'use client';

import { useCallback, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  Edit3,
  Layers,
  MapPin,
  MapPinned,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AdminListCard,
  AdminPanel,
  AdminStatTile,
} from '@/components/admin/ui';
import type { ManagedCity, ManagedNeighborhood, ManagedProvince } from './types';
import type { NeighborhoodManageContext } from './NeighborhoodsManagePage';

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString('fa-IR');
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? 'default' : 'secondary'}
      className={active ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
    >
      {active ? 'فعال' : 'غیرفعال'}
    </Badge>
  );
}

export function LocationsHierarchyView({
  provinces,
  stats,
  onEditProvince,
  onDeleteProvince,
  onEditCity,
  onDeleteCity,
  onManageNeighborhoods,
}: {
  provinces: ManagedProvince[];
  stats?: {
    provinces?: number;
    cities?: number;
    neighborhoods?: number;
    activeCities?: number;
    activeNeighborhoods?: number;
  };
  onEditProvince: (province: ManagedProvince) => void;
  onDeleteProvince: (id: string) => void;
  onEditCity: (city: ManagedCity, provinceId: string) => void;
  onDeleteCity: (id: string) => void;
  onManageNeighborhoods: (ctx: NeighborhoodManageContext) => void;
}) {
  const [expandedProvinces, setExpandedProvinces] = useState<Set<string>>(() => new Set());

  const toggleProvince = useCallback((id: string) => {
    setExpandedProvinces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openNeighborhoods = useCallback(
    (province: ManagedProvince, city: ManagedCity) => {
      onManageNeighborhoods({
        city,
        provinceId: province.id,
        provinceName: province.name,
      });
    },
    [onManageNeighborhoods]
  );

  return (
    <>
      <AdminPanel
        variant="stats"
        title="پوشش جغرافیایی"
        description="وضعیت پوشش فعال در لایه‌های استان، شهر و محله."
        icon={MapPinned}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminStatTile label="استان" value={formatNumber(stats?.provinces)} icon={MapPin} tone="indigo" />
          <AdminStatTile label="شهر" value={formatNumber(stats?.cities)} icon={Building2} tone="amber" />
          <AdminStatTile label="محله" value={formatNumber(stats?.neighborhoods)} icon={MapPinned} tone="violet" />
        </div>
        {stats?.cities != null && stats.neighborhoods != null && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="admin-progress-row">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-(--color-secondaryText)">شهرهای فعال</span>
                <span className="font-bold text-(--color-primaryText)">
                  {stats.cities
                    ? `${Math.round(((stats.activeCities ?? 0) / stats.cities) * 100).toLocaleString('fa-IR')}٪`
                    : '—'}
                </span>
              </div>
              <div className="admin-progress-row__track">
                <div
                  className="admin-progress-row__fill bg-amber-500"
                  style={{
                    width: `${stats.cities ? Math.min(100, ((stats.activeCities ?? 0) / stats.cities) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="admin-progress-row">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-(--color-secondaryText)">محله‌های فعال</span>
                <span className="font-bold text-(--color-primaryText)">
                  {stats.neighborhoods
                    ? `${Math.round(((stats.activeNeighborhoods ?? 0) / stats.neighborhoods) * 100).toLocaleString('fa-IR')}٪`
                    : '—'}
                </span>
              </div>
              <div className="admin-progress-row__track">
                <div
                  className="admin-progress-row__fill bg-violet-500"
                  style={{
                    width: `${stats.neighborhoods ? Math.min(100, ((stats.activeNeighborhoods ?? 0) / stats.neighborhoods) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel
        title="استان‌ها، شهرها و محله‌ها"
        description="هر شهر را باز کنید؛ محله‌ها در پنل جدا با جستجو و جدول مدیریت می‌شوند."
        icon={Layers}
      >
        <div className="space-y-3">
          {provinces.map((province) => {
            const expanded = expandedProvinces.has(province.id);
            const neighborhoodTotal = province.cities.reduce(
              (sum, c) => sum + c.neighborhoods.length,
              0
            );

            return (
              <AdminListCard key={province.id} className="overflow-hidden p-0">
                <div className="admin-province-head flex w-full items-center gap-2 px-4 py-3.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-right transition-colors hover:bg-(--color-navItemBgHover) -mx-1 px-1 py-0.5"
                    onClick={() => toggleProvince(province.id)}
                    aria-expanded={expanded}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--color-mainColorMuted) text-(--color-coloredText) transition-transform ${
                        expanded ? 'rotate-[-90deg]' : ''
                      }`}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{province.name}</h3>
                        <StatusPill active={province.isActive} />
                      </div>
                      <p className="mt-1 text-[11px] text-(--color-tertiaryText)" dir="ltr">
                        {province.id} · {province.nameEn}
                      </p>
                      <p className="mt-1.5 text-xs text-(--color-secondaryText)">
                        {formatNumber(province.cities.length)} شهر ·{' '}
                        {formatNumber(neighborhoodTotal)} محله
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="ویرایش استان"
                      onClick={() => onEditProvince(province)}
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      aria-label="حذف استان"
                      onClick={() => onDeleteProvince(province.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-(--color-mainBorder) bg-(--color-inputBg)/40 px-3 py-3">
                    <div className="space-y-2">
                      {province.cities.map((city) => {
                        const nCount = city.neighborhoods.length;
                        const activeN = city.neighborhoods.filter((n) => n.isActive).length;

                        return (
                          <div key={city.id} className="admin-city-row">
                            <div className="admin-city-row__main">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--color-navItemActiveBg) text-(--color-coloredText)">
                                <MapPin className="size-4" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-sm">{city.name}</span>
                                  {!city.isActive && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      غیرفعال
                                    </Badge>
                                  )}
                                  {city.isPopular && (
                                    <Badge variant="outline" className="text-[10px]">
                                      محبوب
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-(--color-tertiaryText)" dir="ltr">
                                  {city.id}
                                </p>
                              </div>
                              <div className="admin-city-row__badge">
                                <span className="admin-city-row__count">{formatNumber(nCount)}</span>
                                <span className="admin-city-row__count-label">محله</span>
                                {nCount > 0 && activeN < nCount && (
                                  <span className="text-[10px] text-(--color-tertiaryText)">
                                    {formatNumber(activeN)} فعال
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="admin-city-row__actions">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 flex-1 text-xs"
                                onClick={() => openNeighborhoods(province, city)}
                              >
                                <Layers className="size-3.5" />
                                {nCount > 0 ? 'مدیریت محله‌ها' : 'افزودن محله'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label="ویرایش شهر"
                                onClick={() => onEditCity(city, province.id)}
                              >
                                <Edit3 className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                aria-label="حذف شهر"
                                onClick={() => onDeleteCity(city.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {province.cities.length === 0 && (
                        <p className="py-6 text-center text-sm text-(--color-secondaryText)">
                          شهری ثبت نشده
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </AdminListCard>
            );
          })}
        </div>
      </AdminPanel>
    </>
  );
}
