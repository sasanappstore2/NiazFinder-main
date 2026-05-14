import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'جستجو | نیاز فایندر',
  description: 'در نیاز فایندر جستجو کنید - کاربران، نیازها و متخصصان',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
