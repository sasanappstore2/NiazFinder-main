import { permanentRedirect } from 'next/navigation';
import { resolveBrowseSegments } from '@/lib/browse/resolve-segments';
import { COUNTRY_SLUG } from '@/config/locations';

interface PageProps {
  params: Promise<{ segments: string[] }>;
}

/**
 * Legacy `/browse/...` URLs → permanent redirect to canonical `/s/...`.
 *
 * Static `next.config.ts` redirects can't disambiguate between
 * `/browse/{city}/{cat}` and `/browse/{parent}/{cat}` because both have the
 * same shape. We use the existing `resolveBrowseSegments` helper to figure
 * out the intent server-side and emit the right canonical URL.
 */
export default async function LegacyBrowseSegments({ params }: PageProps) {
  const { segments } = await params;
  const ctx = resolveBrowseSegments(segments);

  // /browse/{cat} → /s/iran/{cat}
  if (ctx.kind === 'category') {
    permanentRedirect(`/s/${COUNTRY_SLUG}/${ctx.category.slug}`);
  }

  // /browse/{parent}/{cat} → /s/iran/{parent}/{cat}
  if (ctx.kind === 'parent-child') {
    permanentRedirect(`/s/${COUNTRY_SLUG}/${ctx.parent.slug}/${ctx.category.slug}`);
  }

  // /browse/{city}/{cat} → /s/{city}/{cat}
  if (ctx.kind === 'city-category') {
    permanentRedirect(`/s/${ctx.city.slug}/${ctx.category.slug}`);
  }

  // Anything else → bare canonical search root
  permanentRedirect(`/s/${COUNTRY_SLUG}`);
}
