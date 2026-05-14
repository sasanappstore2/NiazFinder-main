import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مقایسه متخصصان | نیاز فایندر',
  description: 'متخصصان را مقایسه کنید و بهترین انتخاب را داشته باشید',
};

export default function CompareSpecialistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
