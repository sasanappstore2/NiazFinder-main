import { permanentRedirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

/** `/n` → canonical needs marketplace root `/n/iran`. */
export default function NeedMarketRootPage() {
  permanentRedirect(routeBuilder.search({ market: 'need' }));
}
