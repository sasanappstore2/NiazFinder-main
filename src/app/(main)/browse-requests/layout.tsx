import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'نیازهای ثبت‌شده | نیاز فایندر',
  description: 'نیازهای ثبت‌شده توسط کارفرمایان را مرور کنید و پیشنهاد بدهید',
};

export default function BrowseRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
