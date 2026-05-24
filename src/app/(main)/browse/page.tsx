import { permanentRedirect } from 'next/navigation';

/** Legacy `/browse` → permanent redirect to canonical `/s/iran`. */
export default function LegacyBrowseRoot() {
  permanentRedirect('/s/iran');
}
