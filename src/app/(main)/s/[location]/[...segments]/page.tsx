import { permanentRedirect } from 'next/navigation';
import { legacySearchRedirectTarget } from '@/lib/search/legacy-s-redirect';

interface PageProps {
  params: Promise<{ location: string; segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Legacy `/s/{location}/{...}` → `/n|b/{location}/{...}`. */
export default async function LegacySearchSegmentsPage({ params, searchParams }: PageProps) {
  const { location, segments } = await params;
  const sp = await searchParams;
  const path = `/s/${location}/${segments.join('/')}`;
  permanentRedirect(legacySearchRedirectTarget(path, sp));
}
