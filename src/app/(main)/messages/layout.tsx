import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پیام‌ها | نیاز فایندر',
  description: 'پیام‌ها و گفتگوهای خود را مدیریت کنید',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
