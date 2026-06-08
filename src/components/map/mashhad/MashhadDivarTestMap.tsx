'use client';

import { MashhadDivarBrowseMap } from '@/components/map/mashhad/MashhadDivarBrowseMap';

/** Dev preview ? same engine as production Mashhad browse maps. */
export function MashhadDivarTestMap({ className }: { className?: string }) {
  return (
    <MashhadDivarBrowseMap
      className={className}
      pins={[]}
      onBboxChange={() => undefined}
      onSelectPin={() => undefined}
      getPinProps={() => ({ selected: false })}
      renderPopup={() => null}
    />
  );
}
