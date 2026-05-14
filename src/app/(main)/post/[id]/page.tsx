'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { PostDetailPage } from '@/components/social/PostDetailPage';

export default function PostDetailRoute() {
  return (
    <AuthGuard>
      <PostDetailPage />
    </AuthGuard>
  );
}
