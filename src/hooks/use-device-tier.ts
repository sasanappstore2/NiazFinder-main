import * as React from 'react';

/** Tailwind-aligned breakpoints */
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type DeviceTier = 'phone' | 'tablet' | 'laptop' | 'desktop';

function tierFromWidth(width: number): DeviceTier {
  if (width < BREAKPOINTS.sm) return 'phone';
  if (width < BREAKPOINTS.lg) return 'tablet';
  if (width < BREAKPOINTS.xl) return 'laptop';
  return 'desktop';
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = React.useState<DeviceTier>('laptop');

  React.useEffect(() => {
    const update = () => setTier(tierFromWidth(window.innerWidth));
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return tier;
}

/** Viewport below laptop breakpoint (legacy handheld-only UI). */
export function useHandheldViewport(): boolean {
  const tier = useDeviceTier();
  return tier === 'phone' || tier === 'tablet';
}
