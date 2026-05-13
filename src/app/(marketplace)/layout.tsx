import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'نیاز فایندر - بازار خدمات',
  description: 'مرور و جستجوی نیازها و متخصصان',
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <Header />

      <main className="flex-1 pt-4">
        <div className="max-w-7xl mx-auto px-4">
          <Breadcrumb />
          <Separator className="my-3" />
          <div className="flex gap-6 pb-12">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 rounded-xl border border-border/50 bg-background/60 p-4 backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-semibold text-foreground">فیلترها</h2>
                {/* Filter placeholder — renders actual filter components in production */}
                <div className="space-y-3" />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </main>

      <div className="mt-auto">
        <Separator />
        <Footer compact />
      </div>

      <MobileBottomNav />
    </div>
  );
}
