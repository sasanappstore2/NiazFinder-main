'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, MapPin, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { cn } from '@/lib/utils';
import type { City, Province } from '@/lib/location-system';
import { useManagedLocations } from '@/lib/use-managed-locations';
import type { LocationSelection } from '@/lib/search/location-scope';
import {
  detectUserCity,
  detectUserLocationFromGps,
  GeoLocationError,
  isGeolocationSupported,
} from '@/lib/location/detect-user-city';

function provinceNameForCityId(provinces: Province[], cityId: string): string {
  for (const province of provinces) {
    if (province.cities.some((c) => c.id === cityId)) return province.name;
  }
  return '';
}

function formatLocationLabel(city: string, province: string): string {
  const c = city.trim();
  const p = province.trim();
  if (c && p) return `${c}، ${p}`;
  if (c) return c;
  if (p) return p;
  return 'انتخاب شهر و استان';
}

export function BusinessLocationPicker({
  city,
  province,
  onChange,
}: {
  city: string;
  province: string;
  onChange: (patch: { city: string; province: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const { cities, provinces } = useManagedLocations();

  const selectedCity = useMemo(() => {
    const trimmed = city.trim();
    if (!trimmed) return null;
    return cities.find((c) => c.name === trimmed) ?? null;
  }, [cities, city]);

  const selectedCities = useMemo(
    () => (selectedCity ? [selectedCity] : []),
    [selectedCity]
  );

  const displayLabel = formatLocationLabel(city, province);

  useEffect(() => {
    if (!selectedCity || province.trim()) return;
    const prov = provinceNameForCityId(provinces, selectedCity.id);
    if (prov && prov !== province.trim()) {
      onChange({ city, province: prov });
    }
  }, [selectedCity, province, city, provinces, onChange]);

  const applyCity = useCallback(
    (record: City | null) => {
      if (!record) {
        onChange({ city: '', province: '' });
        return;
      }
      onChange({
        city: record.name,
        province: provinceNameForCityId(provinces, record.id),
      });
    },
    [onChange, provinces]
  );

  const handleSelectionChange = useCallback(
    (selection: LocationSelection) => {
      applyCity(selection.cities[0] ?? null);
      setOpen(false);
    },
    [applyCity]
  );

  const runGeoDetection = useCallback(async () => {
    if (!isGeolocationSupported()) {
      toast.error('موقعیت‌یابی', {
        description: 'مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.',
      });
      return;
    }

    setIsDetecting(true);
    try {
      const geo = await detectUserLocationFromGps({ highAccuracy: true });
      if (geo) {
        const prov = provinceNameForCityId(provinces, geo.cityId);
        onChange({ city: geo.cityName, province: prov });
        toast.success('موقعیت تشخیص داده شد', {
          description: formatLocationLabel(geo.cityName, prov),
        });
        setOpen(false);
        return;
      }

      const nearest = await detectUserCity();
      if (nearest) {
        const prov = provinceNameForCityId(provinces, nearest.id);
        onChange({ city: nearest.name, province: prov });
        toast.success('موقعیت تشخیص داده شد', {
          description: formatLocationLabel(nearest.name, prov),
        });
        setOpen(false);
        return;
      }

      toast.error('موقعیت‌یابی', { description: 'شهر از موقعیت شما پیدا نشد.' });
    } catch (e) {
      if (e instanceof GeoLocationError && e.code === 'denied') {
        toast.error('موقعیت‌یابی', {
          description: 'اجازه دسترسی به موقعیت داده نشد. در تنظیمات مرورگر اجازه دهید.',
        });
      } else {
        toast.error('موقعیت‌یابی', { description: 'تشخیص موقعیت ناموفق بود.' });
      }
    } finally {
      setIsDetecting(false);
    }
  }, [onChange, provinces]);

  return (
    <div className="space-y-2">
      <Label>شهر و استان</Label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isDetecting}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
            'hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40',
            isDetecting && 'cursor-wait opacity-70'
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <MapPin className="size-4 shrink-0 text-emerald-600" />
            <span
              className={cn(
                'truncate',
                !city.trim() && !province.trim() && 'text-muted-foreground'
              )}
            >
              {isDetecting ? 'در حال تشخیص موقعیت…' : displayLabel}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>

        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-1.5 px-3"
          disabled={isDetecting || !isGeolocationSupported()}
          onClick={() => void runGeoDetection()}
        >
          {isDetecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPinned className="size-4" />
          )}
          <span className="text-sm">موقعیت من</span>
        </Button>
      </div>

      {open ? (
        <CitySelectorPopup
          open={open}
          onOpenChange={setOpen}
          selectedCities={selectedCities}
          onSelectionChange={handleSelectionChange}
          maxSelection={1}
          geoStatus={isDetecting ? 'detecting' : 'idle'}
          detectedCity={selectedCity}
          isDetecting={isDetecting}
          onDetectLocation={() => void runGeoDetection()}
        />
      ) : null}
    </div>
  );
}
