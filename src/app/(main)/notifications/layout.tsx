import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'اعلان‌ها | نیاز فایندر',
  description: 'اعلان‌ها و هشدارهای خود را مشاهده کنید',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
