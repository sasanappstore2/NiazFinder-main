import { permanentRedirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

/** `/b` → canonical business marketplace root `/b/iran`. */
export default function BusinessMarketRootPage() {
  permanentRedirect(routeBuilder.search({ market: 'business' }));
}
