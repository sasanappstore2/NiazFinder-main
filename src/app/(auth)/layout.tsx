import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'نیاز فایندر - ورود | ثبت‌نام',
  description: 'ورود یا ثبت‌نام در پلتفرم نیاز فایندر',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-linear-to-br from-emerald-50 via-background to-emerald-50 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/20"
    >
      {/* Decorative background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <main id="main-content" className="w-full min-w-0 max-w-md">{children}</main>
    </div>
  );
}
