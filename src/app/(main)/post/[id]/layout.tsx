import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return {
    title: 'پست | نیاز فایندر',
    description: 'مشاهده پست در فید اجتماعی نیاز فایندر',
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
