import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ثبت نظر | نیاز فایندر',
  description: 'نظر و امتیاز خود را ثبت کنید',
};

export default function SubmitReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
