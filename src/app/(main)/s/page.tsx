import { permanentRedirect } from 'next/navigation';
import { legacySearchRedirectTarget } from '@/lib/search/legacy-s-redirect';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Legacy `/s` → `/n/iran` or `/b/iran` when `?type=business`. */
export default async function LegacySearchRootPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  permanentRedirect(legacySearchRedirectTarget('/s', sp));
}
