import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return {
    title: 'پروفایل متخصص | نیاز فایندر',
    description: 'پروفایل متخصص، نمونه‌کارها و نظرات',
  };
}

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
