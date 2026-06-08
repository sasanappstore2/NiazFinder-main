'use client';

import { Minus, Navigation, Plus } from 'lucide-react';
/** Works with both Mapbox GL and MapLibre via react-map-gl. */
type CompatibleMapRef = React.RefObject<{
  getMap(): {
    getZoom(): number;
    zoomTo(zoom: number, options?: { duration?: number }): void;
    flyTo(options: { center: [number, number]; zoom: number; duration?: number }): void;
  };
} | null>;
import { isValidLatLng } from '@/lib/map/coords';
import { cn } from '@/lib/utils';

const ZOOM_IN = '\u0628\u0632\u0631\u06af\u200c\u0646\u0645\u0627\u06cc\u06cc';
const ZOOM_OUT = '\u06a9\u0648\u0686\u06a9\u200c\u0646\u0645\u0627\u06cc\u06cc';
const LOCATE = '\u0645\u0648\u0642\u0639\u06cc\u062a \u0645\u0646';

export function NiazMapControls({
  mapRef,
  mobileMode,
}: {
  mapRef: CompatibleMapRef;
  mobileMode?: boolean;
}) {
  const locate = () => {
    const map = mapRef.current?.getMap();
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!isValidLatLng(lat, lng)) return;
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const zoom = (delta: number) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 200 });
  };

  return (
    <div
      className={cn(
        'bm-control-stack pointer-events-auto absolute z-[400]',
        mobileMode ? 'bottom-3 left-3 top-auto' : 'top-3 right-3 left-auto bottom-auto'
      )}
      role="toolbar"
      aria-label={'\u06a9\u0646\u062a\u0631\u0644\u200c\u0647\u0627\u06cc \u0646\u0642\u0634\u0647'}
    >
      <button type="button" className="bm-control-btn" onClick={() => zoom(1)} aria-label={ZOOM_IN} title={ZOOM_IN}>
        <Plus strokeWidth={2.25} aria-hidden />
      </button>
      <button type="button" className="bm-control-btn" onClick={() => zoom(-1)} aria-label={ZOOM_OUT} title={ZOOM_OUT}>
        <Minus strokeWidth={2.25} aria-hidden />
      </button>
      <button type="button" className="bm-control-btn" onClick={locate} aria-label={LOCATE} title={LOCATE}>
        <Navigation strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
