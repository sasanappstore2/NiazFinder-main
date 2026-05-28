/**
 * Fibonacci spacing + golden-ratio layout for product detail page.
 * Scale: 8 → 13 → 21 → 34 → 55 (aligned with need-browse-card-tokens / ai-lead-tokens).
 */
export const productFib = {
  xs: 8,
  sm: 13,
  md: 21,
  lg: 34,
  xl: 55,
} as const;

/** Golden ratio column split — gallery ~61.8%, buy panel ~38.2% */
export const PRODUCT_GRID_DESKTOP =
  'lg:grid lg:grid-cols-[minmax(0,1.618fr)_minmax(0,1fr)] lg:gap-[34px] lg:items-start';

export const PRODUCT_PAGE_MAX = 'mx-auto w-full max-w-[min(100%,55rem)] xl:max-w-[min(100%,61.8rem)]';

export const PRODUCT_GALLERY_SQUARE =
  'relative aspect-square w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/40 shadow-sm';

export const PRODUCT_IMAGE_CONTAIN = 'object-contain p-[13px]';

export const PRODUCT_THUMB_SIZE = 'size-[72px] sm:size-[80px]';

/** Comfortable reading width (34 × 16px, φ-friendly) */
export const PRODUCT_READING_MAX = 'max-w-[34rem]';

export const PRODUCT_SECTION_DIVIDER = 'mt-[34px] border-t border-border/50 pt-[34px]';

export const PRODUCT_STICKY_TOP = 'lg:sticky lg:top-[calc(var(--header-height,4rem)+21px)]';
