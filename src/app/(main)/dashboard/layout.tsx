import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'داشبورد | نیاز فایندر',
  description: 'داشبورد مدیریت حساب کاربری',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
