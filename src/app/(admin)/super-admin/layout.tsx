import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'سوپرادمین | نیاز فایندر',
  description: 'مرکز فرمان سوپرادمین برای مدیریت کامل سایت نیاز فایندر',
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return children;
}
