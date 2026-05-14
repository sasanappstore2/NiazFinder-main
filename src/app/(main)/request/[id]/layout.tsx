import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return {
    title: 'جزئیات نیاز | نیاز فایندر',
    description: 'جزئیات و پیشنهادهای نیاز ثبت‌شده',
  };
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
