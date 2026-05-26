'use client';

import { AdminPageShell } from '@/components/admin/ui';
import { RbacManager } from '@/components/admin/rbac/RbacManager';

export function SystemPanel() {
  return (
    <AdminPageShell section="system" layout="form" description="مدیریت نقش‌ها، مجوزها و دسترسی کارمندان">
      <div className="admin-content-zone rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-4">
        <RbacManager />
      </div>
    </AdminPageShell>
  );
}
