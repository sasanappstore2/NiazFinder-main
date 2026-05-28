'use client';

import { BusinessStorefrontEditor } from '@/components/business-profile/BusinessStorefrontEditor';
import { useBusinessHub } from '../BusinessHubContext';

export function BusinessStorefrontPanel() {
  const { profile, refresh } = useBusinessHub();
  if (!profile?.primaryCategorySlug) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
        ابتدا ثبت کسب‌وکار را تکمیل کنید.
      </div>
    );
  }

  return (
    <BusinessStorefrontEditor
      primaryCategorySlug={profile.primaryCategorySlug}
      occupationSlugs={profile.occupationSlugs}
      onMutate={() => void refresh()}
    />
  );
}
