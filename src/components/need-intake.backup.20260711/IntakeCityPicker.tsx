'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { cn } from '@/lib/utils';
import type { City } from '@/lib/location-system';
import { useManagedLocations } from '@/lib/use-managed-locations';
import type { LocationSelection } from '@/lib/search/location-scope';

interface IntakeCityPickerProps {
  cityName: string;
  onCityChange: (city: City | null) => void;
  className?: string;
  disabled?: boolean;
}

export function IntakeCityPicker({
  cityName,
  onCityChange,
  className,
  disabled,
}: IntakeCityPickerProps) {
  const [open, setOpen] = useState(false);
  const { cities } = useManagedLocations();

  const selectedCity = useMemo(() => {
    const trimmed = cityName.trim();
    if (!trimmed) return null;
    return cities.find((c) => c.name === trimmed) ?? null;
  }, [cities, cityName]);

  const selectedCities = useMemo(
    () => (selectedCity ? [selectedCity] : []),
    [selectedCity]
  );

  const handleSelectionChange = useCallback(
    (selection: LocationSelection) => {
      const city = selection.cities[0] ?? null;
      onCityChange(city);
      setOpen(false);
    },
    [onCityChange]
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
          'hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !cityName.trim() && 'text-muted-foreground')}>
            {cityName.trim() || 'انتخاب شهر'}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <CitySelectorPopup
          open={open}
          onOpenChange={setOpen}
          selectedCities={selectedCities}
          onSelectionChange={handleSelectionChange}
          maxSelection={1}
        />
      ) : null}
    </>
  );
}
