'use client';

import { useEffect } from 'react';
import { NiazMapMarker as Marker } from '@/components/map/maplibre/map-marker';
import { NiazMapPopup as Popup } from '@/components/map/maplibre/map-popup';
import { useNiazMapRef } from '@/components/map/mapbox/NiazMapContext';
import { MapClusterMarker, MapPinMarker } from '@/components/map/mapbox/MapPinMarker';
import { useMapClusters, type MapPoint } from '@/components/map/mapbox/use-map-clusters';
import { isValidLatLng } from '@/lib/business/map-coords';

export function NiazMapClusterLayerMaplibre<T extends MapPoint>({
  points,
  selectedPinId,
  onSelectPin,
  showPopups = true,
  maxZoom,
  getPinProps,
  renderPopup,
}: {
  points: T[];
  selectedPinId: string | null;
  onSelectPin: (pin: T | null) => void;
  showPopups?: boolean;
  maxZoom?: number;
  getPinProps: (pin: T) => {
    selected: boolean;
    verified?: boolean;
    approximate?: boolean;
    color?: string;
  };
  renderPopup: (pin: T) => React.ReactNode;
}) {
  const mapRef = useNiazMapRef();
  const { clusters, refresh, index } = useMapClusters(mapRef, points, { maxZoom });

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const handler = () => refresh();
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => {
      map.off('moveend', handler);
      map.off('zoomend', handler);
    };
  }, [mapRef, refresh]);

  const popupPin =
    showPopups && selectedPinId
      ? (points.find((p) => p.id === selectedPinId) ?? null)
      : null;

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        if (!isValidLatLng(lat, lng)) return null;
        const props = feature.properties;
        const isCluster = Boolean(props.cluster);

        if (isCluster) {
          const count = props.point_count ?? 0;
          return (
            <Marker
              key={`c-${feature.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                const map = mapRef.current?.getMap();
                if (!map) return;
                const expansion = index.getClusterExpansionZoom(feature.id as number);
                map.easeTo({ center: [lng, lat], zoom: expansion, duration: 300 });
              }}
            >
              <MapClusterMarker count={count} />
            </Marker>
          );
        }

        const pin = props as T;
        const pinProps = getPinProps(pin);

        return (
          <Marker
            key={pin.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectPin(pin);
            }}
          >
            <MapPinMarker
              selected={pinProps.selected}
              verified={pinProps.verified}
              approximate={pinProps.approximate}
              color={pinProps.color}
            />
          </Marker>
        );
      })}

      {popupPin && isValidLatLng(popupPin.lat, popupPin.lng) ? (
        <Popup
          longitude={popupPin.lng}
          latitude={popupPin.lat}
          anchor="bottom"
          offset={[0, -36] as [number, number]}
          closeButton
          closeOnClick={false}
          className="bm-popup"
          onClose={() => onSelectPin(null)}
        >
          {renderPopup(popupPin)}
        </Popup>
      ) : null}
    </>
  );
}
