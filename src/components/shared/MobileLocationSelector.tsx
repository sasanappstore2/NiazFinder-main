'use client';

import { Suspense } from 'react';
import { MapPin, ChevronLeft } from 'lucide-react';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { cn } from '@/lib/utils';
import { useLocationSelection } from '@/hooks/use-location-selection';

export function MobileLocationSelector() {
  return (
    <Suspense fallback={null}>
      <MobileLocationSelectorInner />
    </Suspense>
  );
}

function MobileLocationSelectorInner() {
  const {
    isOpen,
    setIsOpen,
    selectedCities,
    selectedProvinceIds,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  } = useLocationSelection();

  const hasLocationScope =
    selectedCities.length > 0 || selectedProvinceIds.length > 0;

  if (!isInitialized) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`انتخاب شهر — ${getLocationDisplayText()}`}
        className={cn(
          'flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 touch-target-min',
          hasLocationScope
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <MapPin className="size-4 shrink-0" />
        <span className="flex-1 text-start">{getLocationDisplayText()}</span>
        <ChevronLeft className="size-3 opacity-50" />
      </button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        selectedProvinceIds={selectedProvinceIds}
        onSelectionChange={handleSelectionChange}
        geoStatus={geo.status}
        detectedCity={geo.detectedCity}
        isDetecting={geo.isDetecting}
        onDetectLocation={() => void geo.runDetection()}
      />
    </>
  );
}
