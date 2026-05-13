'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Shield,
  Settings,
  BarChart3,
  ChevronLeft,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'داشبورد مدیریتی', href: '/admin', icon: LayoutDashboard },
  { title: 'کاربران', href: '/admin/users', icon: Users, badge: '۱۲۴' },
  { title: 'درخواست‌ها', href: '/admin/requests', icon: FileText },
  { title: 'تراکنش‌ها', href: '/admin/transactions', icon: CreditCard },
  { title: 'گزارش‌ها', href: '/admin/reports', icon: BarChart3 },
  { title: 'تنظیمات سیستم', href: '/admin/settings', icon: Settings },
];

function AdminGuard({ children }: { children: React.ReactNode }) {
  // In production, this would check actual auth/role
  const isAdmin = true;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-foreground">
            دسترسی محدود
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            شما دسترسی مدیریت این بخش را ندارید
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">بازگشت به خانه</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Admin Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-sm">
          A
        </div>
        <div>
          <span className="text-lg font-bold text-foreground">پنل مدیریت</span>
          <Badge variant="destructive" className="mr-2 text-[10px] px-1.5">
            ادمین
          </Badge>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {item.badge && (
                <span className="mr-auto rounded-full bg-accent px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronLeft className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* Footer */}
      <div className="p-3">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          خروج از پنل مدیریت
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="fixed right-0 top-0 hidden h-screen w-64 border-l border-border/50 bg-background/95 backdrop-blur-sm lg:block">
          <SidebarContent pathname={pathname} />
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-background/95 px-4 backdrop-blur-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <SidebarContent pathname={pathname} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-foreground">پنل مدیریت</span>
          </header>
        </div>

        {/* Main Content */}
        <main className="lg:pr-64">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
