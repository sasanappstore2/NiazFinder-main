import { permanentRedirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

/** Legacy `/browse` → canonical `/n/iran`. */
export default function LegacyBrowseRootPage() {
  permanentRedirect(routeBuilder.search({ market: 'need' }));
}
