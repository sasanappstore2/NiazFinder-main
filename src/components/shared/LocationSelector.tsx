'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { City } from '@/lib/location-system';
import { cookieManager } from '@/lib/cookie-manager';

export function LocationSelector() {
  const { toast } = useToast();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCities, setSelectedCities] = React.useState<City[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize selected cities from cookies
  React.useEffect(() => {
    const prefs = cookieManager.getPreferences();
    if (prefs.location.selectedCities.length > 0) {
      setSelectedCities(prefs.location.selectedCities);
    }
    setIsInitialized(true);
  }, []);

  const handleSelectionChange = (cities: City[]) => {
    setSelectedCities(cities);

    // Save to cookies
    cookieManager.updateLocation(cities);

    if (cities.length > 0) {
      toast({
        title: 'انتخاب مکان',
        description: cities.length === 1
          ? `${cities[0].name} انتخاب شد`
          : `${cities.length} شهر انتخاب شد`,
      });
    }
  };

  const getLocationDisplayText = () => {
    if (selectedCities.length === 0) return 'انتخاب شهر';
    if (selectedCities.length === 1) return selectedCities[0].name;
    return `${selectedCities.length} شهر`;
  };

  // Don't render until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return (
      <div className="hidden sm:flex h-9 w-[130px] items-center justify-center">
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
          'hidden sm:inline-flex h-9 px-3 gap-1.5 text-sm font-normal shrink-0',
          selectedCities.length > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="انتخاب شهر"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[100px]">
          {getLocationDisplayText()}
        </span>
        {selectedCities.length > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-[18px] px-1 text-[10px] font-bold tabular-nums"
          >
            {selectedCities.length}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        onSelectionChange={handleSelectionChange}
        title="انتخاب شهر"
        description="شهرهای مورد نظر خود را انتخاب کنید"
      />
    </>
  );
}
