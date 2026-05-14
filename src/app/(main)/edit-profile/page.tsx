'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { EditProfilePage } from '@/components/social/EditProfilePage';

export default function EditProfileRoute() {
  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
        <Breadcrumb />
        <Separator className="my-4" />
        <EditProfilePage />
      </div>
    </AuthGuard>
  );
}
