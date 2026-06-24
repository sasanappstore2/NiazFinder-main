'use client';

import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import { BusinessHubLayout } from './BusinessHubLayout';
import { RealEstateHubLayout } from './real-estate/RealEstateHubLayout';
import { useBusinessHub } from './BusinessHubContext';

export function BusinessHubRouter({
  onProfileSaved,
}: {
  onProfileSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { profile } = useBusinessHub();

  if (!profile) return null;

  if (isRealEstateBusiness(profile.occupationSlugs)) {
    return <RealEstateHubLayout onProfileSaved={onProfileSaved} />;
  }

  return <BusinessHubLayout onProfileSaved={onProfileSaved} />;
}
