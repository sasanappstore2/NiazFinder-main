'use client';

import { useMemo, useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useManagedLocations } from '@/lib/use-managed-locations';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import { NeighborhoodSelectorModal } from '@/components/browse/NeighborhoodSelectorModal';
import type { ServiceAreaEntry } from '@/lib/business/ecosystem/types';

export function ServiceAreaOnboardingFields({
  cityName,
  areas,
  maxAreas = 12,
  onChange,
}: {
  cityName: string;
  areas: ServiceAreaEntry[];
  maxAreas?: number;
  onChange: (areas: ServiceAreaEntry[]) => void;
}) {
  const { cities } = useManagedLocations();
  const trimmedCity = cityName.trim();
  const cityId = useMemo(() => {
    if (!trimmedCity) return null;
    return cities.find((c) => c.name === trimmedCity)?.id ?? null;
  }, [cities, trimmedCity]);

  const { neighborhoods, isLoading, hasNeighborhoods } = useCityNeighborhoods(cityId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedIds = useMemo(
    () => areas.map((a) => a.neighborhoodId).filter((id): id is string => Boolean(id)),
    [areas]
  );

  const applyNeighborhoodIds = (ids: string[]) => {
    if (!trimmedCity) {
      toast.error('ابتدا در مرحلهٔ تماس، شهر فعالیت را انتخاب کنید');
      return;
    }
    if (ids.length > maxAreas) {
      toast.message(`حداکثر ${maxAreas} محله می‌توانید انتخاب کنید`);
      return;
    }

    const byId = new Map(neighborhoods.map((n) => [n.id, n]));
    const next: ServiceAreaEntry[] = ids
      .map((id) => {
        const n = byId.get(id);
        if (!n) {
          const existing = areas.find((a) => a.neighborhoodId === id);
          return existing ?? null;
        }
        return {
          city: trimmedCity,
          cityId: cityId ?? undefined,
          neighborhood: n.name,
          neighborhoodId: n.id,
          strength: 3,
        };
      })
      .filter((e): e is ServiceAreaEntry => e != null);

    onChange(next);
    setPickerOpen(false);
  };

  const removeById = (neighborhoodId: string) => {
    onChange(areas.filter((a) => a.neighborhoodId !== neighborhoodId));
  };

  const canPick = Boolean(trimmedCity && cityId && hasNeighborhoods && !isLoading);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">محله‌های تحت پوشش</p>
        {trimmedCity ? (
          <Badge variant="secondary" className="gap-1 font-normal">
            <MapPin className="size-3.5 text-emerald-600" />
            {trimmedCity}
          </Badge>
        ) : (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            شهر را در مرحلهٔ تماس انتخاب کنید
          </span>
        )}
      </div>

      <div
        className={cn(
          'min-h-[3.25rem] rounded-xl border border-dashed border-border/80 bg-muted/15 p-3',
          areas.length === 0 && 'flex items-center justify-center'
        )}
      >
        {areas.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            هنوز محله‌ای انتخاب نشده — برای تطبیق بهتر با درخواست‌ها، محله‌های فعالیت خود را
            اضافه کنید.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <Badge
                key={area.neighborhoodId ?? area.neighborhood}
                variant="secondary"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-sm font-normal"
              >
                {area.neighborhood ?? area.neighborhoodId}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`حذف ${area.neighborhood}`}
                  onClick={() => area.neighborhoodId && removeById(area.neighborhoodId)}
                >
                  <X className="size-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!canPick || areas.length >= maxAreas}
        onClick={() => setPickerOpen(true)}
      >
        <Plus className="size-4" />
        {isLoading ? 'بارگذاری محله‌ها…' : 'افزودن محله'}
      </Button>

      {trimmedCity && !isLoading && !hasNeighborhoods && (
        <p className="text-xs text-muted-foreground">
          فهرست محله برای این شهر در سیستم ثبت نشده است.
        </p>
      )}

      <NeighborhoodSelectorModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        neighborhoods={neighborhoods}
        selectedIds={selectedIds}
        onApply={applyNeighborhoodIds}
      />
    </div>
  );
}
