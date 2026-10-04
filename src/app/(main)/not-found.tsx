import Link from 'next/link';
import { Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** In-layout 404 for notFound() calls inside (main) — keeps header/nav. */
export default function MainNotFound() {
  return (
    <div dir="rtl" className="flex min-h-[50dvh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">صفحه مورد نظر یافت نشد</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          این صفحه وجود ندارد یا منتقل شده است.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              صفحه اصلی
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">جستجو</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
