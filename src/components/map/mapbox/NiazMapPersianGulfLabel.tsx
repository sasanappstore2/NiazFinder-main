'use client';

import { useEffect, useState } from 'react';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import {
  PERSIAN_GULF_LABEL_LINE_LNG_LAT,
  PERSIAN_GULF_LABEL_MAX_ZOOM,
  PERSIAN_GULF_LABEL_MIN_ZOOM,
  PERSIAN_GULF_LABEL_TEXT,
} from '@/lib/map/iran/viewport-geo';

type LabelPlacement = {
  x: number;
  y: number;
  angle: number;
  fontSize: number;
  opacity: number;
};

function resolveLabelMetrics(zoom: number): { fontSize: number; opacity: number } {
  if (zoom <= 5) return { fontSize: 28, opacity: 0.96 };
  if (zoom <= 7) return { fontSize: 40, opacity: 0.94 };
  if (zoom <= 9) return { fontSize: 52, opacity: 0.92 };
  return { fontSize: 56, opacity: 0.8 };
}

function isOnScreen(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 80
): boolean {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= width + margin &&
    y <= height + margin
  );
}

export function NiazMapPersianGulfLabel() {
  const mapRef = useNiazMapRef();
  const [placement, setPlacement] = useState<LabelPlacement | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const update = () => {
      const zoom = map.getZoom();
      if (zoom < PERSIAN_GULF_LABEL_MIN_ZOOM || zoom > PERSIAN_GULF_LABEL_MAX_ZOOM) {
        setPlacement(null);
        return;
      }

      const [[startLng, startLat], [endLng, endLat]] = PERSIAN_GULF_LABEL_LINE_LNG_LAT;
      const start = map.project([startLng, startLat]);
      const end = map.project([endLng, endLat]);
      const canvas = map.getCanvas();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (
        !isOnScreen(start.x, start.y, width, height) &&
        !isOnScreen(end.x, end.y, width, height)
      ) {
        setPlacement(null);
        return;
      }

      const { fontSize, opacity } = resolveLabelMetrics(zoom);
      setPlacement({
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        // RTL line label: add 180deg so the phrase reads from the first coordinate.
        angle: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 180,
        fontSize,
        opacity,
      });
    };

    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('resize', update);
    map.on('load', update);

    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('resize', update);
      map.off('load', update);
    };
  }, [mapRef]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {placement ? (
        <div
          className="niaz-persian-gulf-label"
          style={{
            left: placement.x,
            top: placement.y,
            transform: `translate(-50%, -50%) rotate(${placement.angle}deg)`,
            fontSize: placement.fontSize,
            opacity: placement.opacity,
          }}
        >
          {PERSIAN_GULF_LABEL_TEXT}
        </div>
      ) : null}
    </div>
  );
}
