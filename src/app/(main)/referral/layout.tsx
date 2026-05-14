import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دعوت از دوستان | نیاز فایندر',
  description: 'دوستان خود را دعوت کنید و پاداش دریافت کنید',
};

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return children;
}
