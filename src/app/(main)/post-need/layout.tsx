import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ثبت نیاز | نیاز فایندر',
  description: 'نیاز خود را ثبت کنید و از متخصصان پیشنهاد بگیرید',
};

export default function PostNeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
