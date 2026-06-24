'use client';

import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { NiazMapCore } from '@/components/map/mapbox/NiazMapCore';
import { NiazMapViewportScope } from '@/components/map/mapbox/NiazMapViewportScope';
import { MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import { DeferredMapShell } from '@/components/map/DeferredMapShell';
import { cn } from '@/lib/utils';

export function BusinessProfileLocationMap({
  lat,
  lng,
  className,
  title = '\u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647',
}: {
  lat: number;
  lng: number;
  city?: string;
  className?: string;
  title?: string;
}) {
  return (
    <DeferredMapShell
      className={cn(
        'business-browse-map overflow-hidden rounded-xl border border-border/50',
        className
      )}
      placeholderClassName="h-52 sm:h-60"
      loadingLabel={title}
    >
      <div aria-label={title}>
        <NiazMapCore
          center={{ lat, lng, zoom: 15 }}
          detail="picker"
          interactive={false}
          className="h-52 sm:h-60"
        >
          <NiazMapViewportScope viewportBounds={null} scopeKind="national" />
          <Marker longitude={lng} latitude={lat} anchor="bottom">
            <MapPinMarker selected verified />
          </Marker>
        </NiazMapCore>
      </div>
    </DeferredMapShell>
  );
}
