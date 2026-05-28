'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AdminLayoutProvider } from '@/components/admin/context/AdminLayoutContext';
import { AdminLayout } from '@/components/admin/nellavio/AdminLayout';

/** پوستهٔ یکپارچه سوپرادمین (سایدبار + ناوبار + تم Nellavio) */
export function SuperAdminShell({ children }: { children: ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('admin-refresh'));
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  return (
    <AdminLayoutProvider>
      <AdminLayout onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        <div className="admin-content-zone">{children}</div>
      </AdminLayout>
    </AdminLayoutProvider>
  );
}
