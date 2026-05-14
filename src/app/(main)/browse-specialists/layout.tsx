import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'متخصصان | نیاز فایندر',
  description: 'متخصصان حرفه‌ای را در تمامی حوزه‌ها پیدا کنید',
};

export default function BrowseSpecialistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
