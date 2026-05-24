'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { City } from '@/lib/location-system';
import { cookieManager } from '@/lib/cookie-manager';
import {
  buildUrlFromCitySelection,
  citiesFromUrl,
} from '@/lib/search/apply-location';

export function LocationSelector() {
  return (
    <Suspense
      fallback={
        <div className="flex h-9 w-auto min-w-[100px] items-center justify-center">
          <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
        </div>
      }
    >
      <LocationSelectorInner />
    </Suspense>
  );
}

function LocationSelectorInner() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCities, setSelectedCities] = React.useState<City[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Sync from URL first, then fall back to cookies
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

  const getLocationDisplayText = () => {
    if (selectedCities.length === 0) return 'تمام ایران';
    if (selectedCities.length === 1) return selectedCities[0].name;
    return `${selectedCities.length} شهر`;
  };

  if (!isInitialized) {
    return (
      <div className="flex h-9 w-auto min-w-[100px] items-center justify-center">
        <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          'hidden sm:inline-flex h-9 px-3 gap-1.5 text-sm font-normal shrink-0 rounded-lg',
          'border border-border/40 transition-all duration-200',
          selectedCities.length > 0
            ? 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/30 shadow-[0_0_8px_oklch(0.51_0.12_165/0.08)]'
            : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border/60'
        )}
        title="انتخاب شهر"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[100px]">{getLocationDisplayText()}</span>
        {selectedCities.length > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-[18px] px-1 text-caption font-bold tabular-nums"
          >
            {selectedCities.length}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          'sm:hidden h-9 px-2.5 gap-1.5 text-sm font-normal shrink-0 rounded-lg',
          'border border-border/40 transition-all duration-200',
          selectedCities.length > 0
            ? 'bg-primary/8 text-primary border-primary/20'
            : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
        )}
        title="انتخاب شهر"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[60px] text-xs">{getLocationDisplayText()}</span>
        {selectedCities.length > 0 && (
          <Badge
            variant="secondary"
            className="h-4 min-w-[16px] px-1 text-[9px] font-bold tabular-nums"
          >
            {selectedCities.length}
          </Badge>
        )}
      </Button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        onSelectionChange={handleSelectionChange}
      />
    </>
  );
}
