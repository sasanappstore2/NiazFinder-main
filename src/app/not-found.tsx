'use client';

import Link from 'next/link';
import { Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { routeBuilder } from '@/config/routes';

const popularCategories = [
  { name: 'املاک', href: routeBuilder.search({ market: 'need', location: 'iran', category: 'real-estate' }) },
  { name: 'آپارتمان اجاره', href: routeBuilder.search({ market: 'need', location: 'mashhad', category: 'apartment-rent' }) },
  { name: 'خودرو', href: routeBuilder.search({ market: 'need', location: 'iran', category: 'car' }) },
  { name: 'موبایل', href: routeBuilder.search({ market: 'need', location: 'iran', category: 'mobile-phone' }) },
  { name: 'خدمات', href: routeBuilder.search({ market: 'need', location: 'iran', category: 'services' }) },
  { name: 'ثبت نیاز', href: routeBuilder.needNew() },
];

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12"
    >
      <div className="w-full max-w-lg text-center">
        {/* Creative Illustration */}
        <div className="relative mx-auto mb-8">
          {/* Large 404 number */}
          <div className="text-[120px] sm:text-[160px] font-black leading-none text-emerald-100 dark:text-emerald-900/40 select-none">
            ۴۰۴
          </div>

          {/* Search icon on top */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full bg-background p-4 shadow-lg border border-border/50">
              <Search className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          صفحه مورد نظر یافت نشد
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          صفحه‌ای که دنبال آن هستید وجود ندارد یا منتقل شده است. از جستجو
          استفاده کنید یا به یکی از صفحات پرکاربرد مراجعه کنید.
        </p>

        {/* Search */}
        <div className="mt-8 mx-auto max-w-sm">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative"
          >
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="جستجو در نیاز فایندر..."
              className="pr-9 h-11"
            />
          </form>
        </div>

        {/* Popular Categories */}
        <div className="mt-8">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            دسته‌بندی‌های پرطرفدار
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularCategories.map((cat) => (
              <Link key={cat.href} href={cat.href}>
                <Badge
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
                >
                  {cat.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-10">
          <Link href="/">
            <Button
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Home className="h-4 w-4" />
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
