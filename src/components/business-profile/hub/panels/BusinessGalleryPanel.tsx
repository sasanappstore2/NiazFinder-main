'use client';

import { BusinessProfileCMS } from '@/components/business-profile/BusinessProfileCMS';
import { useBusinessHub } from '../BusinessHubContext';

export function BusinessGalleryPanel() {
  const { profile, refresh } = useBusinessHub();

  return (
    <BusinessProfileCMS
      hideOffers
      primaryCategorySlug={profile?.primaryCategorySlug ?? undefined}
      onMutate={() => void refresh()}
    />
  );
}
