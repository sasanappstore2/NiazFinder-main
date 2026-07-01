import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'میزکار املاک | نیاز فایندر',
  description: 'میزکار روزانه مشاوران و دفاتر املاک',
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
