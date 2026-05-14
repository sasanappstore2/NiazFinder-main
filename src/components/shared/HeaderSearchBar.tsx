'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ============ Types ============
interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

interface HeaderSearchBarProps {
  data: SearchItem[];
  onSelect?: (item: SearchItem) => void;
}

// ============ Header Search Bar Component ============
export function HeaderSearchBar({ data, onSelect }: HeaderSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    const lowerCaseQuery = query.toLowerCase().trim();
    return data.filter((item) =>
      item.title.toLowerCase().includes(lowerCaseQuery) ||
      item.description.toLowerCase().includes(lowerCaseQuery) ||
      item.category.toLowerCase().includes(lowerCaseQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerCaseQuery))
    );
  }, [query, data]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showResults = isExpanded && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" dir="rtl">
        {/* Search input */}
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="جستجو در خدمات و نیازها..."
            className={cn(
              'h-10 w-full rounded-xl border-border/60 bg-muted/50 pe-10 ps-4 text-sm backdrop-blur-sm transition-all duration-200',
              'focus-visible:bg-background focus-visible:border-primary/50 focus-visible:ring-primary/20',
              showResults && 'rounded-b-none border-b-0'
            )}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsExpanded(true);
            }}
            onFocus={() => setIsExpanded(true)}
            value={query}
            aria-label="جستجو"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="پاک کردن جستجو"
            >
              <X className="size-4" />
            </button>
          ) : (
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          )}
        </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute start-0 end-0 top-full z-[var(--z-dropdown,100)] mt-0 overflow-hidden rounded-b-xl border border-t-0 border-border/60 bg-background shadow-[0_16px_48px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {filteredData.length > 0 ? (
                <>
                  <p className="mb-2 px-3 pt-1 text-[11px] font-semibold text-muted-foreground">
                    {filteredData.length.toLocaleString('fa-IR')} نتیجه یافت شد
                  </p>
                  {filteredData.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect?.(item);
                        setIsExpanded(false);
                      }}
                      className="w-full rounded-lg p-3 text-start transition-colors duration-100 hover:bg-accent/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </h4>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {item.category}
                        </span>
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="py-8 text-center">
                  <Search className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    نتیجه‌ای یافت نشد
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    عبارت دیگری را جستجو کنید
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ============ Demo Data ============
export const DEMO_SEARCH_DATA: SearchItem[] = [
  {
    id: '1',
    title: 'طراحی وب‌سایت فروشگاهی',
    description: 'طراحی و توسعه یک فروشگاه آنلاین مدرن با درگاه پرداخت',
    category: 'طراحی وب',
    tags: ['فروشگاه', 'آنلاین', 'پرداخت'],
  },
  {
    id: '2',
    title: 'توسعه اپلیکیشن موبایل',
    description: 'ساخت اپلیکیشن iOS و Android با قابلیت آفلاین',
    category: 'موبایل',
    tags: ['اپلیکیشن', 'iOS', 'Android'],
  },
  {
    id: '3',
    title: 'تولید محتوای سئو شده',
    description: 'نوشتن مقالات و محتوای وبلاگ بهینه‌سازی شده برای موتورهای جستجو',
    category: 'تولید محتوا',
    tags: ['سئو', 'مقاله', 'وبلاگ'],
  },
  {
    id: '4',
    title: 'طراحی لوگو و هویت بصری',
    description: 'طراحی لوگو حرفه‌ای و ست هویت بصری کامل برای برند شما',
    category: 'گرافیک',
    tags: ['لوگو', 'برندینگ', 'هویت بصری'],
  },
  {
    id: '5',
    title: 'تعمیرات لوازم خانگی',
    description: 'تعمیر انواع لوازم خانگی در محل شما با گارانتی خدمات',
    category: 'خدمات خانگی',
    tags: ['تعمیرات', 'لوازم خانگی', 'در محل'],
  },
  {
    id: '6',
    title: 'مشاوره سرمایه‌گذاری',
    description: 'مشاوره تخصصی در زمینه سرمایه‌گذاری و مدیریت مالی',
    category: 'مشاوره',
    tags: ['سرمایه‌گذاری', 'مالی', 'مشاوره'],
  },
  {
    id: '7',
    title: 'نصب و راه‌اندازی شبکه',
    description: 'نصب و پیکربندی شبکه‌های کامپیوتری و اینترنتی',
    category: 'فناوری اطلاعات',
    tags: ['شبکه', 'اینترنت', 'نصب'],
  },
  {
    id: '8',
    title: 'خدمات نظافت منزل',
    description: 'نظافت عمیق و تمیزکاری منزل و محل کار با تجهیزات حرفه‌ای',
    category: 'خدمات خانگی',
    tags: ['نظافت', 'تمیزکاری', 'منزل'],
  },
];
