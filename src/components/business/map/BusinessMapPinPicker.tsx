'use client';

import { useEffect, useMemo, useState } from 'react';
import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { MapPin, Navigation } from 'lucide-react';
import { resolveBusinessMapCenterFromCityLabel } from '@/lib/business/map-default-center';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { NiazMapRecenter } from '@/components/map/mapbox/NiazMapRecenter';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_HINT =
  '\u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u06a9\u0644\u06cc\u06a9 \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0645\u0627\u0631\u06a9\u0631 \u0631\u0627 \u0628\u06a9\u0634\u06cc\u062f \u062a\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0642\u06cc\u0642 \u0641\u0631\u0648\u0634\u06af\u0627\u0647 \u0645\u0634\u062e\u0635 \u0634\u0648\u062f.';
const MY_LOCATION_LABEL = '\u0645\u0648\u0642\u0639\u06cc\u062a \u0645\u0646';
const NO_PIN_YET = '\u0647\u0646\u0648\u0632 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.';
const CLEAR_PIN = '\u062d\u0630\u0641 \u0645\u0648\u0642\u0639\u06cc\u062a \u0627\u0632 \u0646\u0642\u0634\u0647';

export function BusinessMapPinPicker({
  city,
  lat,
  lng,
  onChange,
  className,
  hint = DEFAULT_HINT,
}: {
  city: string;
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  className?: string;
  hint?: string;
}) {
  const center = useMemo(() => resolveBusinessMapCenterFromCityLabel(city), [city]);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );

  useEffect(() => {
    if (lat != null && lng != null) {
      setPosition({ lat, lng });
    }
  }, [lat, lng]);

  const setCoords = (next: { lat: number; lng: number } | null) => {
    setPosition(next);
    onChange(next);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('\u062f\u0633\u062a\u06af\u0627\u0647 \u0634\u0645\u0627 \u0627\u0632 \u0645\u0648\u0642\u0639\u06cc\u062a\u200c\u06cc\u0627\u0628 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        toast.error(
          '\u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u062f \u0634\u062f \u06cc\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const viewCenter = position ?? center;
  const viewZoom = position ? 15 : center.zoom;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={useMyLocation}>
          <Navigation className="size-3.5" aria-hidden />
          {MY_LOCATION_LABEL}
        </Button>
      </div>

      <div className="business-browse-map overflow-hidden rounded-xl border border-border/50">
        <NiazMapCore
          center={{ ...center, zoom: viewZoom }}
          detail="picker"
          className="h-[280px] sm:h-[320px]"
          onMapClick={(la, ln) => setCoords({ lat: la, lng: ln })}
        >
          <NiazMapViewportScope viewportBounds={null} scopeKind="national" />
          <NiazMapRecenter center={viewCenter} zoom={viewZoom} />
          {position ? (
            <Marker
              longitude={position.lng}
              latitude={position.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
            >
              <MapPinMarker selected />
            </Marker>
          ) : null}
        </NiazMapCore>
      </div>

      {position ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
          <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-400">{NO_PIN_YET}</p>
      )}

      {position ? (
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setCoords(null)}>
          {CLEAR_PIN}
        </Button>
      ) : null}
    </div>
  );
}
