import { permanentRedirect } from 'next/navigation';

/**
 * `/s` → permanent redirect to canonical country root `/s/iran`.
 * This keeps the search root reachable as a bare `/s` URL while the canonical
 * SEO target remains `/s/iran`.
 */
export default function SearchRootRedirect() {
  permanentRedirect('/s/iran');
}
