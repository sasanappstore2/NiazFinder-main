/** Local demo photos for filing gallery UI preview when a listing has no images. */
export const FILING_DEMO_GALLERY_IMAGES = [
  '/filing/demo/01-living.webp',
  '/filing/demo/02-bedroom.webp',
  '/filing/demo/03-kitchen.webp',
  '/filing/demo/04-view.webp',
  '/filing/demo/05-exterior.webp',
] as const;

/**
 * In development (or when NEXT_PUBLIC_FILING_DEMO_GALLERY=true), fall back to demo
 * photos so gallery/carousel layout can be reviewed without scraped image URLs.
 */
export function resolveFilingGalleryImages(images: string[]): string[] {
  if (images.length > 0) return images;

  const demoEnabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_FILING_DEMO_GALLERY === 'true';

  return demoEnabled ? [...FILING_DEMO_GALLERY_IMAGES] : [];
}
