import { permanentRedirect } from 'next/navigation';
import { legacySearchRedirectTarget } from '@/lib/search/legacy-s-redirect';

interface PageProps {
  params: Promise<{ location: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Legacy `/s/{location}` → `/n|b/{location}`. */
export default async function LegacySearchLocationPage({ params, searchParams }: PageProps) {
  const { location } = await params;
  const sp = await searchParams;
  permanentRedirect(legacySearchRedirectTarget(`/s/${location}`, sp));
}
