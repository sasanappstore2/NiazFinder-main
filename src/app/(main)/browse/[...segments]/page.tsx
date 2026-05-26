import { permanentRedirect } from 'next/navigation';
import { resolveBrowseSegments } from '@/lib/browse/resolve-segments';
import { COUNTRY_SLUG } from '@/config/locations';
import { routeBuilder } from '@/config/routes';

interface PageProps {
  params: Promise<{ segments: string[] }>;
}

/**
 * Legacy `/browse/...` URLs → permanent redirect to canonical `/n/...`.
 *
 * Static `next.config.ts` redirects can't disambiguate between
 * `/browse/{city}/{cat}` and `/browse/{parent}/{cat}` because both have the
 * same shape. We use the existing `resolveBrowseSegments` helper to figure
 * out the intent server-side and emit the right canonical URL.
 */
export default async function LegacyBrowseSegments({ params }: PageProps) {
  const { segments } = await params;
  const ctx = resolveBrowseSegments(segments);

  if (ctx.kind === 'category') {
    permanentRedirect(
      routeBuilder.search({
        market: 'need',
        location: COUNTRY_SLUG,
        category: ctx.category.slug,
      })
    );
  }

  if (ctx.kind === 'parent-child') {
    permanentRedirect(
      routeBuilder.search({
        market: 'need',
        location: COUNTRY_SLUG,
        parentCategory: ctx.parent.slug,
        category: ctx.category.slug,
      })
    );
  }

  if (ctx.kind === 'city-category') {
    permanentRedirect(
      routeBuilder.search({
        market: 'need',
        location: ctx.city.slug,
        category: ctx.category.slug,
      })
    );
  }

  permanentRedirect(routeBuilder.search({ market: 'need' }));
}
