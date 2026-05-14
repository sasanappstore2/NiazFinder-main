import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return {
    title: 'پروفایل کاربر | نیاز فایندر',
    description: 'پروفایل کاربر در نیاز فایندر',
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
