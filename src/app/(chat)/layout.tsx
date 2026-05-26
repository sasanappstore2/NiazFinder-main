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
      <div className="flex min-h-0 flex-1 flex-col h-dvh max-h-dvh overflow-hidden">
        {children}
      </div>
    </AppShell>
  );
}
