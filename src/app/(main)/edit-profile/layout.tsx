import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ویرایش پروفایل | نیاز فایندر',
  description: 'اطلاعات پروفایل خود را ویرایش کنید',
};

export default function EditProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
