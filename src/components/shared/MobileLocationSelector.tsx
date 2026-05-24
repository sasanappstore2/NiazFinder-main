'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MapPin, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { cn } from '@/lib/utils';
import type { City } from '@/lib/location-system';
import { cookieManager } from '@/lib/cookie-manager';
import {
  buildUrlFromCitySelection,
  citiesFromUrl,
} from '@/lib/search/apply-location';

export function MobileLocationSelector() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCities, setSelectedCities] = React.useState<City[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const fromUrl = citiesFromUrl(pathname, searchParams);
    if (fromUrl.length > 0) {
      setSelectedCities(fromUrl);
      cookieManager.updateLocation(fromUrl);
    } else {
      const prefs = cookieManager.getPreferences();
      if (prefs.location.selectedCities.length > 0) {
        setSelectedCities(prefs.location.selectedCities);
      }
    }
    setIsInitialized(true);
  }, [pathname, searchParams]);

  const handleSelectionChange = (cities: City[]) => {
    setSelectedCities(cities);
    cookieManager.updateLocation(cities);

    const url = buildUrlFromCitySelection(pathname, searchParams, cities);
    router.push(url);

    if (cities.length > 0) {
      toast({
        title: 'انتخاب مکان',
        description:
          cities.length === 1
            ? `${cities[0].name} انتخاب شد`
            : `${cities.length} شهر انتخاب شد`,
      });
    }
  };

  const getDisplayText = () => {
    if (selectedCities.length === 0) return 'تمام ایران';
    if (selectedCities.length === 1) return selectedCities[0].name;
    return `${selectedCities.length} شهر انتخاب شده`;
  };

  if (!isInitialized) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          selectedCities.length > 0
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <MapPin className="size-4 shrink-0" />
        <span className="flex-1 text-start">{getDisplayText()}</span>
        <ChevronLeft className="size-3 opacity-50" />
      </button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        onSelectionChange={handleSelectionChange}
      />
    </>
  );
}
