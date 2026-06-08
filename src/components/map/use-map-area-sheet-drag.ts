'use client';

import { useCallback, useRef, useState } from 'react';
import {
  MAP_AREA_SHEET_PEEK,
  MAP_AREA_SHEET_SNAP_FULL,
  MAP_AREA_SHEET_SNAP_MID,
  resolveMapAreaPeekHeightPx,
} from '@/components/map/map-area-sheet-constants';

const DRAG_THRESHOLD_PX = 8;
const FLICK_VELOCITY = 0.35;

export type MapAreaSheetSnap = number | string | null;

type SnapPoint = { value: MapAreaSheetSnap; px: number };

function viewportHeight(): number {
  return typeof window !== 'undefined' ? window.innerHeight : 800;
}

export function resolveMapAreaSheetHeightPx(
  snap: MapAreaSheetSnap,
  peekHeightPx = resolveMapAreaPeekHeightPx(false)
): number {
  const vh = viewportHeight();
  if (snap === MAP_AREA_SHEET_PEEK || snap == null) return peekHeightPx;
  if (snap === MAP_AREA_SHEET_SNAP_MID) return vh * MAP_AREA_SHEET_SNAP_MID;
  if (snap === MAP_AREA_SHEET_SNAP_FULL) return vh * MAP_AREA_SHEET_SNAP_FULL;
  if (typeof snap === 'number') return vh * snap;
  return peekHeightPx;
}

function snapPoints(peekHeightPx: number): SnapPoint[] {
  const vh = viewportHeight();
  return [
    { value: MAP_AREA_SHEET_PEEK, px: peekHeightPx },
    { value: MAP_AREA_SHEET_SNAP_MID, px: vh * MAP_AREA_SHEET_SNAP_MID },
    { value: MAP_AREA_SHEET_SNAP_FULL, px: vh * MAP_AREA_SHEET_SNAP_FULL },
  ];
}

function clamp(px: number, peekHeightPx: number): number {
  const vh = viewportHeight();
  return Math.min(vh * MAP_AREA_SHEET_SNAP_FULL, Math.max(peekHeightPx, px));
}

function nearestSnap(heightPx: number, velocity: number, peekHeightPx: number): MapAreaSheetSnap {
  const points = snapPoints(peekHeightPx);

  if (velocity > FLICK_VELOCITY) {
    const next = points.find((p) => p.px > heightPx + 16);
    return next?.value ?? MAP_AREA_SHEET_SNAP_FULL;
  }
  if (velocity < -FLICK_VELOCITY) {
    const prev = [...points].reverse().find((p) => p.px < heightPx - 16);
    return prev?.value ?? MAP_AREA_SHEET_PEEK;
  }

  return points.reduce((best, point) =>
    Math.abs(point.px - heightPx) < Math.abs(best.px - heightPx) ? point : best
  ).value;
}

export function useMapAreaSheetDrag({
  snap,
  onSnapChange,
  peekHeightPx,
}: {
  snap: MapAreaSheetSnap;
  onSnapChange: (value: MapAreaSheetSnap) => void;
  peekHeightPx: number;
}) {
  const [dragHeightPx, setDragHeightPx] = useState<number | null>(null);
  const liveHeightRef = useRef(peekHeightPx);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    moved: boolean;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);

  const isDragging = dragHeightPx != null;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const startHeight = resolveMapAreaSheetHeightPx(snap, peekHeightPx);
      liveHeightRef.current = startHeight;
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight,
        moved: false,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocity: 0,
      };
    },
    [snap, peekHeightPx]
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const now = performance.now();
    const dt = Math.max(now - drag.lastTime, 1);
    drag.velocity = (drag.lastY - event.clientY) / dt;
    drag.lastY = event.clientY;
    drag.lastTime = now;

    const dy = drag.startY - event.clientY;
    if (Math.abs(dy) > DRAG_THRESHOLD_PX) drag.moved = true;

    const next = clamp(drag.startHeight + dy, peekHeightPx);
    liveHeightRef.current = next;
    setDragHeightPx(next);
  }, [peekHeightPx]);

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = null;

      if (drag.moved) {
        onSnapChange(nearestSnap(liveHeightRef.current, drag.velocity, peekHeightPx));
      }
      setDragHeightPx(null);
    },
    [onSnapChange, peekHeightPx]
  );

  return {
    isDragging,
    displayHeightPx: dragHeightPx ?? resolveMapAreaSheetHeightPx(snap, peekHeightPx),
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
