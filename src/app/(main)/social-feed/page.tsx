'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { SocialFeedPage } from '@/components/social/SocialFeedPage';

export default function SocialFeedRoute() {
  return (
    <AuthGuard>
      <SocialFeedPage />
    </AuthGuard>
  );
}
