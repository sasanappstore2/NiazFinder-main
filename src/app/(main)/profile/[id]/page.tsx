'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/components/social/UserProfile';

export default function ProfileRoute() {
  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
        <Breadcrumb />
        <Separator className="my-4" />
        <UserProfile />
      </div>
    </AuthGuard>
  );
}
