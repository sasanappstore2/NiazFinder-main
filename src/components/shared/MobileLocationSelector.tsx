'use client';

import { MapPin, ChevronLeft } from 'lucide-react';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { cn } from '@/lib/utils';
import { useLocationSelection } from '@/hooks/use-location-selection';

export function MobileLocationSelector() {
  const {
    isOpen,
    setIsOpen,
    selectedCities,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  } = useLocationSelection();

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
        <span className="flex-1 text-start">{getLocationDisplayText()}</span>
        <ChevronLeft className="size-3 opacity-50" />
      </button>

      <CitySelectorPopup
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedCities={selectedCities}
        onSelectionChange={handleSelectionChange}
        geoStatus={geo.status}
        detectedCity={geo.detectedCity}
        isDetecting={geo.isDetecting}
        onDetectLocation={() => void geo.runDetection(true)}
      />
    </>
  );
}
