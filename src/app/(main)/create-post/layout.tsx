import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ثبت پست | نیاز فایندر',
  description: 'پست جدید در فید اجتماعی نیاز فایندر منتشر کنید',
};

export default function CreatePostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
