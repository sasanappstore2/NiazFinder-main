'use client';

import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useManagedLocations } from '@/lib/use-managed-locations';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import { NeighborhoodSelectorModal } from '@/components/browse/NeighborhoodSelectorModal';
import { useBusinessHub } from '../../BusinessHubContext';

export function ListingNeighborhoodPicker({
  neighborhoodId,
  locationLabel,
  cityId,
  onChange,
}: {
  neighborhoodId?: string;
  locationLabel?: string;
  cityId?: string;
  onChange: (patch: {
    neighborhoodId?: string;
    location?: string;
    cityId?: string;
  }) => void;
}) {
  const { profile } = useBusinessHub();
  const cityName = profile?.city?.trim() ?? '';
  const { cities } = useManagedLocations();
  const resolvedCityId = useMemo(() => {
    if (cityId) return cityId;
    if (!cityName) return null;
    return cities.find((c) => c.name === cityName)?.id ?? null;
  }, [cityId, cityName, cities]);

  const { neighborhoods, isLoading, hasNeighborhoods } = useCityNeighborhoods(resolvedCityId);
  const [open, setOpen] = useState(false);

  const label =
    locationLabel?.trim() ||
    neighborhoods.find((n) => n.id === neighborhoodId)?.name ||
    'انتخاب محله';

  const canPick = Boolean(cityName && resolvedCityId && hasNeighborhoods && !isLoading);

  const apply = (ids: string[]) => {
    const id = ids[0];
    if (!id) {
      onChange({ neighborhoodId: undefined, location: undefined, cityId: resolvedCityId ?? undefined });
      setOpen(false);
      return;
    }
    const n = neighborhoods.find((x) => x.id === id);
    onChange({
      neighborhoodId: id,
      location: n?.name ?? locationLabel,
      cityId: resolvedCityId ?? undefined,
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-start gap-2 px-3 font-normal"
        disabled={!canPick}
        onClick={() => {
          if (!cityName) {
            toast.error('ابتدا شهر کسب‌وکار را در معرفی و تماس ثبت کنید');
            return;
          }
          if (!canPick) {
            toast.message('برای این شهر هنوز محله‌ای در سیستم ثبت نشده');
            return;
          }
          setOpen(true);
        }}
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{label}</span>
      </Button>

      <NeighborhoodSelectorModal
        open={open}
        onOpenChange={setOpen}
        neighborhoods={neighborhoods}
        selectedIds={neighborhoodId ? [neighborhoodId] : []}
        onApply={(ids) => apply(ids.slice(0, 1))}
      />
    </>
  );
}
