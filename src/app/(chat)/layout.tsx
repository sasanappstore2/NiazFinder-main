import type { Metadata } from 'next';

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
    <div className="flex" dir="rtl" style={{ height: 'calc(100vh - 64px)' }}>
      {children}
    </div>
  );
}
