import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'نیاز فایندر - پیام‌ها',
  description: 'گفتگوی آنلاین با متخصصان و کارفرمایان',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell minimalChrome>
      <div className="flex h-dvh max-h-dvh min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </AppShell>
  );
}
