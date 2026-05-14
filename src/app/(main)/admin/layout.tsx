import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پنل مدیریت | نیاز فایندر',
  description: 'پنل مدیریت و نظارت بر نیاز فایندر',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
