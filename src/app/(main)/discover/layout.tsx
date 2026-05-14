import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'کشف کاربران | نیاز فایندر',
  description: 'کاربران جدید و فعال نیاز فایندر را کشف کنید',
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
