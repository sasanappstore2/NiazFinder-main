'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Settings,
  Users,
  Bell,
  Gift,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: 'داشبورد', href: '/dashboard', icon: LayoutDashboard },
  { title: 'درخواست‌های من', href: '/dashboard/requests', icon: FileText },
  { title: 'کیف پول', href: '/dashboard/payments', icon: CreditCard },
  { title: 'دعوت از دوستان', href: '/dashboard/referral', icon: Gift },
  { title: 'تنظیمات', href: '/dashboard/settings', icon: Settings },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
          N
        </div>
        <span className="text-lg font-bold text-foreground">نیاز فایندر</span>
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {isActive && <ChevronLeft className="mr-auto h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* User info footer */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <Skeleton className="mb-1 h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          خروج
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="fixed right-0 top-0 hidden h-screen w-64 border-l border-border/50 bg-background/80 backdrop-blur-sm lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile Header + Sidebar */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <SidebarContent pathname={pathname} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-foreground">داشبورد</span>
        </header>
      </div>

      {/* Main Content */}
      <main className="lg:pr-64">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb />
          </div>

          {/* Page content */}
          {children}
        </div>
      </main>
    </div>
  );
}
