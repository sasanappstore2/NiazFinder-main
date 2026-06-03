'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BrandAuraBackdrop } from '@/components/business-profile/BrandAuraBackdrop';
import {
  atmosphereToCssVars,
  normalizeBrandAtmosphere,
} from '@/lib/color/brand-atmosphere';
import {
  extractBrandColorsFromImage,
  type BrandAuraColors,
} from '@/lib/color/extract-brand-colors';
import { cn } from '@/lib/utils';

const INITIAL_COLORS: BrandAuraColors = {
  primary: '#9ca3af',
  secondary: '#6b7280',
  vivid: '#9ca3af',
};

/**
 * Full-bleed brand atmosphere behind header → footer; colors from logo (accent + gray).
 */
export function BusinessProfileAuraScope({
  logoUrl,
  children,
  className,
}: {
  logoUrl?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const [rawColors, setRawColors] = useState<BrandAuraColors>(INITIAL_COLORS);
  const [portalReady, setPortalReady] = useState(false);

  const tokens = useMemo(
    () => normalizeBrandAtmosphere(rawColors),
    [rawColors]
  );

  const auraStyle = atmosphereToCssVars(tokens) as CSSProperties;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-business-profile-page', '');
    return () => {
      document.documentElement.removeAttribute('data-business-profile-page');
    };
  }, []);

  useEffect(() => {
    if (!logoUrl?.trim()) return;

    let cancelled = false;

    void extractBrandColorsFromImage(logoUrl).then((picked) => {
      if (cancelled || !picked) return;
      setRawColors(picked);
    });

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const auraLayer = portalReady ? (
    <div className="business-profile-aura-layer" style={auraStyle} aria-hidden>
      <BrandAuraBackdrop tokens={tokens} className="h-full min-h-full w-full" />
    </div>
  ) : null;

  return (
    <>
      {auraLayer ? createPortal(auraLayer, document.body) : null}
      <div
        data-business-profile=""
        style={auraStyle}
        className={cn(
          'relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
