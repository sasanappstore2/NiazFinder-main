'use client';

import { useEffect, useMemo, useState } from 'react';
import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { MapPin, Navigation, X } from 'lucide-react';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { NiazMapRecenter } from '@/components/map/mapbox/NiazMapRecenter';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import { resolveMapCenterFromCityLabel } from '@/lib/map/default-center';
import { getCategoryColor } from '@/lib/categories/category-colors';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_HINT =
  '\u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u06a9\u0644\u06cc\u06a9 \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0645\u0627\u0631\u06a9\u0631 \u0631\u0627 \u0628\u06a9\u0634\u06cc\u062f \u062a\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0642\u06cc\u0642 \u0646\u06cc\u0627\u0632 \u0634\u0645\u0627 \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0634\u0648\u062f.';
const MY_LOCATION_LABEL = '\u0645\u0648\u0642\u0639\u06cc\u062a \u0645\u0646';
const NO_PIN_YET =
  '\u0647\u0646\u0648\u0632 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.';
const CLEAR_PIN = '\u062d\u0630\u0641 \u0645\u0648\u0642\u0639\u06cc\u062a \u0627\u0632 \u0646\u0642\u0634\u0647';
const MAP_PIN_LABEL = '\u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647';

export function NeedMapPinPicker({
  city,
  categorySlug,
  lat,
  lng,
  onChange,
  className,
}: {
  city: string;
  categorySlug?: string | null;
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  className?: string;
}) {
  const center = useMemo(() => resolveMapCenterFromCityLabel(city), [city]);
  const pinColor = getCategoryColor(categorySlug);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );

  useEffect(() => {
    if (lat != null && lng != null) setPosition({ lat, lng });
  }, [lat, lng]);

  useEffect(() => {
    if (!city.trim()) {
      setPosition(null);
      onChange(null);
    }
  }, [city, onChange]);

  const setCoords = (next: { lat: number; lng: number } | null) => {
    setPosition(next);
    onChange(next);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error(
        '\u062f\u0633\u062a\u06af\u0627\u0647 \u0634\u0645\u0627 \u0627\u0632 \u0645\u0648\u0642\u0639\u06cc\u062a\u200c\u06cc\u0627\u0628 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f.'
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        toast.error(
          '\u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u062f \u0634\u062f \u06cc\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a.'
        ),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  if (!city.trim()) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{MAP_PIN_LABEL}</label>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={locateMe}>
            <Navigation className="size-3.5" aria-hidden />
            {MY_LOCATION_LABEL}
          </Button>
          {position ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setCoords(null)}
            >
              <X className="size-3.5" aria-hidden />
              {CLEAR_PIN}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{DEFAULT_HINT}</p>
      <div className="business-browse-map overflow-hidden rounded-xl border border-border/50">
        <NiazMapCore
          key={city}
          center={center}
          detail="picker"
          className="h-[240px] sm:h-[320px]"
          onMapClick={(la, ln) => setCoords({ lat: la, lng: ln })}
        >
          <NiazMapViewportScope viewportBounds={null} scopeKind="national" />
          <NiazMapRecenter center={center} zoom={center.zoom} />
          {position ? (
            <Marker
              longitude={position.lng}
              latitude={position.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
            >
              <MapPinMarker selected color={pinColor} />
            </Marker>
          ) : null}
        </NiazMapCore>
      </div>
      {!position ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {NO_PIN_YET}
        </p>
      ) : null}
    </div>
  );
}
