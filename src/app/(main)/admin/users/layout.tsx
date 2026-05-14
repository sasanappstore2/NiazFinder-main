import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مدیریت کاربران | نیاز فایندر',
  description: 'مدیریت و نظارت بر کاربران نیاز فایندر',
};

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
