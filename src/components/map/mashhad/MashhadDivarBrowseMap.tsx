'use client';

import { IranDivarBrowseMap } from '@/components/map/iran/IranDivarBrowseMap';
import type { MapPoint } from '@/components/map/mapbox/use-map-clusters';

/** @deprecated Use `IranDivarBrowseMap` with `citySlugs={['mashhad']}`. */
export function MashhadDivarBrowseMap<T extends MapPoint>(
  props: Omit<React.ComponentProps<typeof IranDivarBrowseMap<T>>, 'citySlugs'> & {
    citySlugs?: string[];
  }
) {
  return (
    <IranDivarBrowseMap
      {...props}
      citySlugs={props.citySlugs ?? ['mashhad']}
      mapKey={props.mapKey ?? 'mashhad-divar'}
    />
  );
}
