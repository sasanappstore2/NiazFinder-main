'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronDown } from 'lucide-react';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocationSelection } from '@/hooks/use-location-selection';

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
  const pathname = usePathname();
  const {
    isOpen,
    setIsOpen,
    selectedCities,
    selectedProvinceIds,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  } = useLocationSelection({ preservePathOnHome: pathname === '/' });

  const hasLocationScope =
    selectedCities.length > 0 || selectedProvinceIds.length > 0;
  const badgeCount =
    selectedProvinceIds.length > 0
      ? selectedProvinceIds.length
      : selectedCities.length;

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
          hasLocationScope
            ? 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/30 shadow-[0_0_8px_oklch(0.51_0.12_165/0.08)]'
            : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border/60'
        )}
        title="انتخاب مکان"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[100px]">{getLocationDisplayText()}</span>
        {hasLocationScope && badgeCount > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-[18px] px-1 text-caption font-bold tabular-nums"
          >
            {badgeCount}
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
          hasLocationScope
            ? 'bg-primary/8 text-primary border-primary/20'
            : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
        )}
        title="انتخاب مکان"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[60px] text-xs">{getLocationDisplayText()}</span>
        {hasLocationScope && badgeCount > 0 && (
          <Badge
            variant="secondary"
            className="h-4 min-w-[16px] px-1 text-[9px] font-bold tabular-nums"
          >
            {badgeCount}
          </Badge>
        )}
      </Button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        selectedProvinceIds={selectedProvinceIds}
        onSelectionChange={handleSelectionChange}
        geoStatus={geo.status}
        detectedCity={geo.detectedCity}
        isDetecting={geo.isDetecting}
        onDetectLocation={() => void geo.runDetection(true)}
      />
    </>
  );
}
