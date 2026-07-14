'use client';

import { MapPin, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NeighborhoodSelectorModal } from '@/components/browse/NeighborhoodSelectorModal';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import {
  MAX_COLLABORATION_NEIGHBORHOODS,
  formatCollaborationTargetAreaLabel,
} from '@/lib/business/workspace/collaboration-form';
import type { CollaborationTargetArea } from '@/lib/business/workspace/collaboration-posts';
import { SUBJECT_KIND_LABELS } from '@/lib/business/workspace/collaboration-posts';
import type { City } from '@/lib/location-system';
import type { CollaborationSubjectKind } from '@prisma/client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function CollaborationPreview({
  headline,
  subjectKind,
  areaLabel,
}: {
  headline: string;
  subjectKind: CollaborationSubjectKind;
  areaLabel: string | null;
}) {
  if (!headline && !areaLabel) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
        با انتخاب محله، پیش‌نمایش کارت اینجا نمایش داده می‌شود.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">پیش‌نمایش کارت</p>
      <p className="text-sm font-semibold leading-snug">{headline || '—'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="secondary" className="h-5 text-[10px]">
          {SUBJECT_KIND_LABELS[subjectKind]}
        </Badge>
        {areaLabel ? (
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{areaLabel}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function StepLocation({
  cities,
  citiesLoading,
  cityId,
  targetAreas,
  subjectKind,
  previewHeadline,
  onCityChange,
  onTargetAreasChange,
}: {
  cities: City[];
  citiesLoading: boolean;
  cityId: string;
  targetAreas: CollaborationTargetArea[];
  subjectKind: CollaborationSubjectKind;
  previewHeadline: string;
  onCityChange: (cityId: string) => void;
  onTargetAreasChange: (areas: CollaborationTargetArea[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId]
  );

  const { neighborhoods, isLoading: hoodsLoading, hasNeighborhoods } = useCityNeighborhoods(
    cityId || null
  );

  const areaLabel = formatCollaborationTargetAreaLabel(targetAreas);
  const canPickHoods = Boolean(cityId && hasNeighborhoods && !hoodsLoading);
  const atMax = targetAreas.length >= MAX_COLLABORATION_NEIGHBORHOODS;

  const applyNeighborhoods = (ids: string[]) => {
    if (ids.length > MAX_COLLABORATION_NEIGHBORHOODS) {
      toast.message(`حداکثر ${MAX_COLLABORATION_NEIGHBORHOODS} محله`);
      return;
    }
    if (!selectedCity) return;

    const byId = new Map(neighborhoods.map((n) => [n.id, n]));
    const next: CollaborationTargetArea[] = ids
      .map((id) => {
        const n = byId.get(id);
        if (!n) {
          return targetAreas.find((a) => a.neighborhoodId === id) ?? null;
        }
        return {
          cityId: selectedCity.id,
          city: selectedCity.name,
          neighborhoodId: n.id,
          neighborhood: n.name,
        };
      })
      .filter((a): a is CollaborationTargetArea => a != null);

    onTargetAreasChange(next);
    setPickerOpen(false);
  };

  const removeNeighborhood = (neighborhoodId: string) => {
    onTargetAreasChange(targetAreas.filter((a) => a.neighborhoodId !== neighborhoodId));
  };

  return (
    <>
      <div className="space-y-4">
        <CollaborationPreview
          headline={previewHeadline}
          subjectKind={subjectKind}
          areaLabel={areaLabel}
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">شهر</p>
          <Select
            value={cityId}
            onValueChange={onCityChange}
            disabled={citiesLoading || cities.length === 0}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="انتخاب شهر" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">محله‌ها</p>
            <span className="text-[10px] text-muted-foreground">
              {targetAreas.length.toLocaleString('fa-IR')} /{' '}
              {MAX_COLLABORATION_NEIGHBORHOODS.toLocaleString('fa-IR')}
            </span>
          </div>

          {targetAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {targetAreas.map((area) => (
                <Badge
                  key={area.neighborhoodId}
                  variant="secondary"
                  className="h-7 gap-1 rounded-lg px-2 text-xs font-normal"
                >
                  {area.neighborhood}
                  <button
                    type="button"
                    aria-label={`حذف ${area.neighborhood}`}
                    onClick={() => removeNeighborhood(area.neighborhoodId)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">حداقل یک محله انتخاب کنید.</p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            disabled={!canPickHoods || atMax}
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-4" />
            {hoodsLoading ? 'بارگذاری محله‌ها…' : 'انتخاب محله'}
          </Button>

          {selectedCity && !hoodsLoading && !hasNeighborhoods ? (
            <p className="text-[11px] text-muted-foreground">
              فهرست محله برای این شهر در سیستم ثبت نشده است.
            </p>
          ) : null}
        </div>
      </div>

      <NeighborhoodSelectorModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        neighborhoods={neighborhoods}
        selectedIds={targetAreas.map((a) => a.neighborhoodId)}
        onApply={(ids) => applyNeighborhoods(ids.slice(0, MAX_COLLABORATION_NEIGHBORHOODS))}
      />
    </>
  );
}
