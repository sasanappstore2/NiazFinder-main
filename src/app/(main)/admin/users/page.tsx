'use client';

import { AuthGuard } from '@/components/shared/AuthGuard';
import { AdminUsersPage } from '@/components/social/AdminUsersPage';

export default function AdminUsersRoute() {
  return (
    <AuthGuard>
      <AdminUsersPage />
    </AuthGuard>
  );
}
