'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, Clock, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { LucideIcon } from 'lucide-react';
import {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench,
  GraduationCap, Bot, Briefcase, Scale, Heart, Star, Server,
} from 'lucide-react';

// ============ Types ============
interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

interface APISuggestion {
  id: string;
  type: 'category' | 'subcategory' | 'request';
  title: string;
  description?: string;
  category?: string;
  icon?: string | null;
  priority?: string;
  slug?: string;
}

interface HeaderSearchBarProps {
  data?: SearchItem[];
  onSelect?: (item: SearchItem) => void;
}

// ============ Icon Mapping for Categories ============
const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench,
  GraduationCap, Bot, Briefcase, Scale, Heart, Star, Server,
};

function getCategoryIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Globe;
  return ICON_MAP[iconName] || Globe;
}

// ============ Recent searches from localStorage ============
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('needfinder_recent_searches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  if (query.trim().length < 2) return;
  try {
    const searches = getRecentSearches();
    const updated = [query, ...searches.filter((s) => s !== query)].slice(0, 5);
    localStorage.setItem('needfinder_recent_searches', JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

// ============ Header Search Bar Component ============
export function HeaderSearchBar({ data = [], onSelect }: HeaderSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<APISuggestion[]>([]);
  const [apiCategories, setApiCategories] = useState<APISuggestion[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setApiSuggestions([]);
      return;
    }
    setIsApiLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setApiSuggestions(json.suggestions || []);
      setApiCategories(json.categories || []);
    } catch {
      // Fallback to demo data
      setApiSuggestions([]);
    } finally {
      setIsApiLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query.trim());
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  // Fetch popular categories on mount
  useEffect(() => {
    fetchSuggestions('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const recentSearches = getRecentSearches();

  const showDropdown = isExpanded;
  const hasQuery = query.trim().length > 0;

  const handleSelectSuggestion = (suggestion: APISuggestion) => {
    addRecentSearch(suggestion.title);
    if (suggestion.type === 'category' || suggestion.type === 'subcategory') {
      navigateTo('browse-requests', { categoryId: suggestion.id.replace('cat-', '').replace('subcat-', '') });
    } else if (suggestion.type === 'request') {
      navigateTo('request-detail', { id: suggestion.id.replace('req-', '') });
    }
    setIsExpanded(false);
    setQuery('');
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    navigateTo('browse-requests', { search: term });
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      addRecentSearch(query.trim());
      navigateTo('browse-requests', { search: query.trim() });
      setIsExpanded(false);
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" dir="rtl">
      {/* Search input */}
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="جستجو در خدمات و نیازها..."
          className={cn(
            'h-10 w-full rounded-xl border-border/60 bg-muted/50 pe-10 ps-4 text-sm backdrop-blur-sm transition-all duration-200',
            'focus-visible:bg-background focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[0_0_12px_oklch(0.51_0.12_165/0.15)]',
            showDropdown && 'rounded-b-none border-b-0'
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsExpanded(true);
          }}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          value={query}
          role="combobox"
          aria-expanded={showDropdown}
          aria-label="جستجو"
          aria-autocomplete="list"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsExpanded(true);
            }}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="پاک کردن جستجو"
          >
            <X className="size-4" />
          </button>
        ) : (
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {/* Search Dropdown */}
      {showDropdown && (
        <div className="absolute start-0 end-0 top-full z-[var(--z-dropdown,100)] mt-0 overflow-hidden rounded-b-xl border border-t-0 border-border/60 bg-background shadow-[0_16px_48px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl ring-1 ring-primary/5">
          <ScrollArea className="max-h-[340px]">
            <div className="p-2">
              {hasQuery ? (
                <>
                  {/* API Suggestions */}
                  {isApiLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2">
                      <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">در حال جستجو...</span>
                    </div>
                  ) : apiSuggestions.length > 0 ? (
                    <>
                      {/* Category Suggestions */}
                      {apiSuggestions.filter(s => s.type === 'category' || s.type === 'subcategory').length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <FolderOpen className="size-3" />
                            دسته‌بندی‌ها
                          </p>
                          {apiSuggestions
                            .filter(s => s.type === 'category' || s.type === 'subcategory')
                            .slice(0, 4)
                            .map((item) => {
                              const Icon = getCategoryIcon(item.icon);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(item)}
                                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-100 hover:bg-accent/60"
                                >
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="size-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                                    {item.description && (
                                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Request Suggestions */}
                      {apiSuggestions.filter(s => s.type === 'request').length > 0 && (
                        <div>
                          <p className="mb-1.5 px-3 pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground border-t border-border/30">
                            <Search className="size-3" />
                            نیازها
                          </p>
                          {apiSuggestions
                            .filter(s => s.type === 'request')
                            .slice(0, 4)
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-100 hover:bg-accent/60"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                                  {item.description && (
                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.description}</p>
                                  )}
                                </div>
                                {item.category && (
                                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {item.category}
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}

                      {apiSuggestions.length === 0 && (
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
                </>
              ) : (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mb-2">
                      <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Clock className="size-3" />
                        جستجوهای اخیر
                      </p>
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleRecentClick(term)}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors duration-100 hover:bg-accent/60"
                        >
                          <Clock className="size-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-sm text-foreground">{term}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Popular Categories */}
                  {apiCategories.length > 0 && (
                    <div className={recentSearches.length > 0 ? 'border-t border-border/30 pt-2' : ''}>
                      <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <TrendingUp className="size-3" />
                        دسته‌بندی‌های محبوب
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-2">
                        {apiCategories.slice(0, 8).map((cat) => {
                          const Icon = getCategoryIcon(cat.icon);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(cat)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-primary/10 hover:border-primary/20 hover:text-primary"
                            >
                              <Icon className="size-3.5" />
                              {cat.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ============ Demo Data (kept for backward compatibility) ============
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
