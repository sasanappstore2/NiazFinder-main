'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  MAP_AREA_SHEET_PEEK,
  MAP_AREA_SHEET_SNAP_MID,
  MapAreaResultsSheet,
} from '@/components/map/MapAreaResultsSheet';
import { MapAreaBusinessPeekRow } from '@/components/map/MapAreaPeekRow';
import { resolveMapAreaPeekHeightPx } from '@/components/map/map-area-sheet-constants';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import type { SpecialistProfile } from '@/lib/types';
import { useBusinessMapPins, type BusinessMapPinsQuery } from '@/hooks/use-business-map-pins';
import { BusinessMapListCard } from '@/components/business/map/BusinessMapListCard';
import { BusinessMapMobileLayer } from '@/components/business/map/BusinessMapMobileLayer';
import { filterValidMapPins } from '@/lib/business/map-coords';

const MAP_LOADING = '\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0646\u0642\u0634\u0647\u2026';
const EMPTY_LIST =
  '\u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u0648\u062f\u0648\u062f\u0647 \u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u06cc \u0628\u0627 \u0645\u0648\u0642\u0639\u06cc\u062a \u0631\u0648\u06cc \u0646\u0642\u0634\u0647 \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a';
const LOADING_LIST = '\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0641\u0647\u0631\u0633\u062a\u2026';
const PULL_HINT =
  '\u0628\u06a9\u0634\u06cc\u062f \u0628\u0627\u0644\u0627 \u0628\u0631\u0627\u06cc \u0641\u0647\u0631\u0633\u062a \u06a9\u0627\u0645\u0644';

const SNAP_PEEK: string | number = MAP_AREA_SHEET_PEEK;
const SNAP_MID = MAP_AREA_SHEET_SNAP_MID;
const BusinessBrowseMap = dynamic(
  () =>
    import('@/components/business/map/BusinessBrowseMap').then((m) => m.BusinessBrowseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <span className="text-sm text-muted-foreground">{MAP_LOADING}</span>
      </div>
    ),
  }
);

type MapListItem = {
  pin: BusinessMapPin;
  specialist?: SpecialistProfile;
};

function buildListItems(pins: BusinessMapPin[], specialists: SpecialistProfile[]): MapListItem[] {
  const slugToSpecialist = new Map(
    specialists.filter((s) => s.profileSlug).map((s) => [s.profileSlug!, s])
  );
  return pins.map((pin) => ({
    pin,
    specialist: slugToSpecialist.get(pin.slug),
  }));
}

export function BusinessMapMobileView({
  specialists,
  citySlugs,
  provinceSlugs = [],
  mapQuery,
  fromPathname,
  onCloseMap,
  hasCityScope,
  cityScopeLabel,
  onClearCityScope,
}: {
  specialists: SpecialistProfile[];
  citySlugs: string[];
  provinceSlugs?: string[];
  mapQuery: BusinessMapPinsQuery;
  fromPathname: string;
  onCloseMap?: () => void;
  hasCityScope?: boolean;
  cityScopeLabel?: string;
  onClearCityScope?: () => void;
}) {
  const { pins, loading, fetchPins } = useBusinessMapPins(mapQuery);
  const validPins = useMemo(() => filterValidMapPins(pins), [pins]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number | string | null>(MAP_AREA_SHEET_PEEK);
  const listRef = useRef<HTMLDivElement>(null);

  const listItems = useMemo(() => buildListItems(validPins, specialists), [validPins, specialists]);

  const selectedPin = useMemo(
    () => validPins.find((p) => p.id === selectedPinId) ?? null,
    [validPins, selectedPinId]
  );

  const selectedItem = useMemo(
    () => listItems.find((item) => item.pin.id === selectedPinId) ?? null,
    [listItems, selectedPinId]
  );

  const handleBboxChange = useCallback(
    (bbox: { west: number; south: number; east: number; north: number }) => {
      void fetchPins(bbox);
    },
    [fetchPins]
  );

  const handleMapPinSelect = useCallback((pin: BusinessMapPin | null) => {
    if (pin) {
      setSelectedPinId(pin.id);
      setSnap(SNAP_PEEK);
    } else {
      setSelectedPinId(null);
    }
  }, []);

  const handleListPinSelect = useCallback((pin: BusinessMapPin) => {
    setSelectedPinId(pin.id);
    setSnap(SNAP_MID);
  }, []);

  useEffect(() => {
    if (!selectedPinId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-pin-id="${selectedPinId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedPinId, snap]);

  const sheetPeekPx = resolveMapAreaPeekHeightPx(!loading && listItems.length > 0);
  const peekItem = selectedItem ?? listItems[0] ?? null;

  return (
    <>
      <BusinessMapMobileLayer style={{ '--bm-sheet-peek': `${sheetPeekPx}px` } as React.CSSProperties}>
        <BusinessBrowseMap
          pins={validPins}
          loading={loading}
          citySlugs={citySlugs}
          provinceSlugs={provinceSlugs}
          selectedPinId={selectedPinId}
          selectedPin={selectedPin}
          onSelectPin={handleMapPinSelect}
          onBboxChange={handleBboxChange}
          fromPathname={fromPathname}
          onCloseMap={onCloseMap}
          hasCityScope={hasCityScope}
          cityScopeLabel={cityScopeLabel}
          onClearCityScope={onClearCityScope}
          immersive
          mobileMode
          className="h-full min-h-0"
        />
      </BusinessMapMobileLayer>

      <MapAreaResultsSheet
        snap={snap}
        onSnapChange={setSnap}
        sheetTitle={'\u0641\u0647\u0631\u0633\u062a \u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u0647\u0627'}
        sheetHeading={'\u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u0647\u0627\u06cc \u0627\u06cc\u0646 \u0645\u062d\u062f\u0648\u062f\u0647'}
        count={listItems.length}
        countUnit={'\u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631'}
        loading={loading}
        loadingLabel={LOADING_LIST}
        pullHint={PULL_HINT}
        emptyMessage={EMPTY_LIST}
        peekPreview={
          peekItem ? (
            <MapAreaBusinessPeekRow
              pin={peekItem.pin}
              specialist={peekItem.specialist}
              selected={selectedPinId === peekItem.pin.id}
              onClick={() => handleListPinSelect(peekItem.pin)}
            />
          ) : null
        }
        listRef={listRef}
      >
        {listItems.map(({ pin, specialist }) => (
            <div key={pin.id} data-pin-id={pin.id}>
              <BusinessMapListCard
                pin={pin}
                specialist={specialist}
                selected={selectedPinId === pin.id}
                fromPathname={fromPathname}
                onSelect={() => handleListPinSelect(pin)}
              />
            </div>
          ))
        }
      </MapAreaResultsSheet>
    </>
  );
}
