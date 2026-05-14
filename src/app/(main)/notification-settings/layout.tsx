import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تنظیمات اعلان‌ها | نیاز فایندر',
  description: 'تنظیمات و ترجیحات اعلان‌های خود را مدیریت کنید',
};

export default function NotificationSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
