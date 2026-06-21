import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
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
    <AppShell minimalChrome minimalChromeHandheldOnly>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          'h-dvh max-h-dvh lg:h-auto lg:max-h-none lg:min-h-[calc(100dvh-var(--site-header-offset,4rem)-var(--mobile-nav-offset,0px)-1rem)]'
        )}
      >
        {children}
      </div>
    </AppShell>
  );
}
