import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تعرفه‌ها | نیاز فایندر',
  description: 'طرح‌های قیمت‌گذاری و اشتراک نیاز فایندر',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
