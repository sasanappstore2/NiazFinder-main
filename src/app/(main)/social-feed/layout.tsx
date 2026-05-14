import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'فید اجتماعی | نیاز فایندر',
  description: 'آخرین پست‌ها و فعالیت کاربران در نیاز فایندر',
  openGraph: {
    title: 'فید اجتماعی - نیاز فایندر',
    description: 'آخرین پست‌ها و فعالیت کاربران در نیاز فایندر',
  },
};

export default function SocialFeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
