'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { CreatePostPage } from '@/components/social/CreatePostPage';

export default function CreatePostRoute() {
  return (
    <AuthGuard>
      <CreatePostPage />
    </AuthGuard>
  );
}
