'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, Clock, FolderOpen, Users, Building2 } from 'lucide-react';
import { useStartChat } from '@/hooks/use-start-chat';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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
  /** Tighter input for mobile header row */
  compact?: boolean;
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

function clearRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  try {
    const searches = getRecentSearches().filter((s) => s !== term);
    localStorage.setItem('needfinder_recent_searches', JSON.stringify(searches));
  } catch {
    // Ignore storage errors
  }
}

function clearAllRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('needfinder_recent_searches');
  } catch {
    // Ignore storage errors
  }
}

// ============ Flat list for keyboard navigation ============
interface UnifiedUserHit {
  id: string;
  name: string;
  subtitle?: string;
}

interface UnifiedBusinessHit {
  id: string;
  profileId: string;
  name: string;
  subtitle?: string;
}

interface FlatItem {
  type: 'recent' | 'category' | 'request' | 'popular' | 'user' | 'business';
  id: string;
  title: string;
  data?: APISuggestion;
  term?: string;
  userId?: string;
  profileId?: string;
}

// ============ Header Search Bar Component ============
export function HeaderSearchBar({ data = [], onSelect, compact = false }: HeaderSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<APISuggestion[]>([]);
  const [apiCategories, setApiCategories] = useState<APISuggestion[]>([]);
  const [unifiedUsers, setUnifiedUsers] = useState<UnifiedUserHit[]>([]);
  const [unifiedBusinesses, setUnifiedBusinesses] = useState<UnifiedBusinessHit[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo } = useNavigate();
  const router = useRouter();
  const { openChat } = useStartChat();

  const goToSearchPage = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      addRecentSearch(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsExpanded(false);
      setQuery('');
    },
    [router]
  );

  // Build flat navigation list
  const flatItems: FlatItem[] = (() => {
    const items: FlatItem[] = [];
    const hasQuery = query.trim().length > 0;

    if (!hasQuery) {
      // Recent searches
      recentSearches.forEach((term) => {
        items.push({ type: 'recent', id: `recent-${term}`, title: term, term });
      });
    }

    if (hasQuery) {
      unifiedUsers.slice(0, 3).forEach((u) => {
        items.push({ type: 'user', id: `user-${u.id}`, title: u.name, userId: u.id });
      });
      unifiedBusinesses.slice(0, 3).forEach((b) => {
        items.push({
          type: 'business',
          id: `biz-${b.profileId}`,
          title: b.name,
          userId: b.id,
          profileId: b.profileId,
        });
      });
    }

    if (hasQuery) {
      // Category suggestions
      const catSuggestions = apiSuggestions.filter(s => s.type === 'category' || s.type === 'subcategory');
      catSuggestions.slice(0, 4).forEach(s => {
        items.push({ type: 'category', id: s.id, title: s.title, data: s });
      });
    }

    if (hasQuery) {
      // Request suggestions
      const reqSuggestions = apiSuggestions.filter(s => s.type === 'request');
      reqSuggestions.slice(0, 4).forEach(s => {
        items.push({ type: 'request', id: s.id, title: s.title, data: s });
      });
    }

    if (!hasQuery) {
      // Popular categories
      apiCategories.slice(0, 8).forEach(cat => {
        items.push({ type: 'popular', id: cat.id, title: cat.title, data: cat });
      });
    }

    return items;
  })();

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setApiSuggestions([]);
      setUnifiedUsers([]);
      setUnifiedBusinesses([]);
      return;
    }
    setIsApiLoading(true);
    try {
      const [res, unifiedRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(q)}`),
        q.length >= 2
          ? fetch(`/api/search/unified?q=${encodeURIComponent(q)}&limit=3`)
          : Promise.resolve(null),
      ]);
      const json = await res.json();
      setApiSuggestions(json.suggestions || []);
      setApiCategories(json.categories || []);
      if (unifiedRes?.ok) {
        const unified = await unifiedRes.json();
        setUnifiedUsers(
          (unified.users || []).map((u: { id: string; name: string; subtitle?: string }) => ({
            id: u.id,
            name: u.name,
            subtitle: u.subtitle,
          }))
        );
        setUnifiedBusinesses(
          (unified.businesses || []).map(
            (b: { id: string; profileId: string; name: string; subtitle?: string }) => ({
              id: b.id,
              profileId: b.profileId,
              name: b.name,
              subtitle: b.subtitle,
            })
          )
        );
      } else {
        setUnifiedUsers([]);
        setUnifiedBusinesses([]);
      }
    } catch {
      setApiSuggestions([]);
      setUnifiedUsers([]);
      setUnifiedBusinesses([]);
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
     
  }, []);

  // Refresh recent searches from localStorage when dropdown opens
  useEffect(() => {
    if (isExpanded) {
      setRecentSearches(getRecentSearches());
      setFocusedIndex(-1);
    }
  }, [isExpanded, query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isExpanded;

  const handleSelectSuggestion = (suggestion: APISuggestion) => {
    addRecentSearch(suggestion.title);
    setRecentSearches(getRecentSearches());
    if (suggestion.type === 'category' || suggestion.type === 'subcategory') {
      const catKey = suggestion.slug ?? suggestion.id.replace(/^cat-|^subcat-/, '');
      navigateTo('browse-requests', { categoryId: catKey });
    } else if (suggestion.type === 'request') {
      navigateTo('request-detail', { id: suggestion.id.replace('req-', '') });
    }
    setIsExpanded(false);
    setQuery('');
  };

  const handleRecentClick = (term: string) => {
    goToSearchPage(term);
  };

  const handleSelectUser = (userId: string) => {
    setIsExpanded(false);
    setQuery('');
    void openChat(userId);
  };

  const handleSelectBusiness = (userId: string) => {
    void openChat(userId);
    setIsExpanded(false);
    setQuery('');
  };

  const handleRecentClear = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    clearRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAllRecentSearches();
    setRecentSearches([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter' && query.trim()) {
        goToSearchPage(query.trim());
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsExpanded(true);
        setRecentSearches(getRecentSearches());
        return;
      }
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        break;
      case 'Enter': {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatItems.length) {
          const item = flatItems[focusedIndex];
          if (item.type === 'recent' && item.term) {
            handleRecentClick(item.term);
          } else if (item.type === 'user' && item.userId) {
            handleSelectUser(item.userId);
          } else if (item.type === 'business' && item.userId) {
            handleSelectBusiness(item.userId);
          } else if (item.data) {
            handleSelectSuggestion(item.data);
          } else if (item.type === 'popular' && item.data) {
            handleSelectSuggestion(item.data);
          }
        } else if (query.trim()) {
          goToSearchPage(query.trim());
        }
        break;
      }
      case 'Escape':
        setIsExpanded(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = containerRef.current?.querySelector(`[data-index="${focusedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" dir="rtl">
      {/* Search input */}
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          id="header-search"
          name="q"
          type="search"
          placeholder={compact ? 'جستجو…' : 'جستجوی کاربر، کسب‌وکار، نیاز...'}
          className={cn(
            'w-full rounded-xl border-border/60 bg-muted/50 pe-10 ps-4 text-sm backdrop-blur-xs transition-all duration-200',
            compact
              ? 'h-9 border-border/70 bg-background/80 shadow-sm sm:h-10 sm:bg-muted/50 sm:shadow-none'
              : 'h-10',
            'focus-visible:bg-background focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[0_0_12px_oklch(0.51_0.12_165/0.15)]',
            showDropdown && 'rounded-b-none border-b-0'
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsExpanded(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => {
            setIsExpanded(true);
            setRecentSearches(getRecentSearches());
          }}
          onKeyDown={handleKeyDown}
          value={query}
          role="combobox"
          aria-expanded={showDropdown}
          aria-label="جستجو"
          aria-autocomplete="list"
          aria-activedescendant={focusedIndex >= 0 ? `search-option-${focusedIndex}` : undefined}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsExpanded(true);
              setFocusedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="پاک کردن جستجو"
          >
            <X className="size-4" />
          </button>
        ) : (
          <Search className="absolute inset-e-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {/* Search Dropdown */}
      {showDropdown && (
        <div
          className="absolute inset-s-0 inset-e-0 top-full z-(--z-dropdown,100) mt-0 overflow-hidden rounded-b-xl border border-t-0 border-border/60 bg-background shadow-[0_16px_48px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl ring-1 ring-primary/5"
          role="listbox"
          aria-label="نتایج جستجو"
        >
          <ScrollArea className="max-h-[340px]">
            <div className="p-2">
              {query.trim().length > 0 ? (
                <>
                  {/* API Suggestions with keyboard nav */}
                  {isApiLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2">
                      <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">در حال جستجو...</span>
                    </div>
                  ) : flatItems.length > 0 ? (
                    <>
                      {(flatItems.filter((i) => i.type === 'user').length > 0 ||
                        flatItems.filter((i) => i.type === 'business').length > 0) && (
                        <div className="mb-2">
                          <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                            <Users className="size-3" />
                            کاربران و کسب‌وکار
                          </p>
                          {flatItems
                            .filter((i) => i.type === 'user' || i.type === 'business')
                            .map((item) => {
                              const globalIdx = flatItems.indexOf(item);
                              const Icon = item.type === 'business' ? Building2 : Users;
                              return (
                                <button
                                  key={item.id}
                                  id={`search-option-${globalIdx}`}
                                  data-index={globalIdx}
                                  type="button"
                                  onClick={() => {
                                    if (item.type === 'user' && item.userId) {
                                      handleSelectUser(item.userId);
                                    } else if (item.type === 'business' && item.userId) {
                                      handleSelectBusiness(item.userId);
                                    }
                                  }}
                                  onMouseEnter={() => setFocusedIndex(globalIdx)}
                                  className={cn(
                                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-100',
                                    focusedIndex === globalIdx
                                      ? 'bg-primary/10 text-foreground'
                                      : 'hover:bg-accent/60'
                                  )}
                                >
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="size-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                    <p className="text-caption text-muted-foreground">
                                      {item.type === 'business' ? 'کسب‌وکار' : 'کاربر'}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Category Suggestions */}
                      {flatItems.filter(i => i.type === 'category').length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                            <FolderOpen className="size-3" />
                            دسته‌بندی‌ها
                          </p>
                          {flatItems.filter(i => i.type === 'category').map((item, idx) => {
                            const globalIdx = flatItems.indexOf(item);
                            const Icon = getCategoryIcon(item.data?.icon);
                            return (
                              <button
                                key={item.id}
                                id={`search-option-${globalIdx}`}
                                data-index={globalIdx}
                                type="button"
                                onClick={() => handleSelectSuggestion(item.data!)}
                                onMouseEnter={() => setFocusedIndex(globalIdx)}
                                className={cn(
                                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-100',
                                  focusedIndex === globalIdx ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/60'
                                )}
                              >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <Icon className="size-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                                  {item.data?.description && (
                                    <p className="mt-0.5 text-caption text-muted-foreground">{item.data.description}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Request Suggestions */}
                      {flatItems.filter(i => i.type === 'request').length > 0 && (
                        <div>
                          <p className="mb-1.5 px-3 pt-2 flex items-center gap-1.5 text-caption font-semibold text-muted-foreground border-t border-border/30">
                            <Search className="size-3" />
                            نیازها
                          </p>
                          {flatItems.filter(i => i.type === 'request').map((item) => {
                            const globalIdx = flatItems.indexOf(item);
                            return (
                              <button
                                key={item.id}
                                id={`search-option-${globalIdx}`}
                                data-index={globalIdx}
                                type="button"
                                onClick={() => handleSelectSuggestion(item.data!)}
                                onMouseEnter={() => setFocusedIndex(globalIdx)}
                                className={cn(
                                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-100',
                                  focusedIndex === globalIdx ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/60'
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                                  {item.data?.description && (
                                    <p className="mt-0.5 line-clamp-1 text-caption text-muted-foreground">{item.data.description}</p>
                                  )}
                                </div>
                                {item.data?.category && (
                                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-caption font-medium text-muted-foreground">
                                    {item.data.category}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {flatItems.length === 0 && (
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
                      <div className="mb-1.5 px-3 pt-1 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                          <Clock className="size-3" />
                          جستجوهای اخیر
                        </p>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="text-caption text-muted-foreground/60 hover:text-destructive transition-colors"
                          aria-label="پاک کردن همه جستجوهای اخیر"
                        >
                          پاک کردن همه
                        </button>
                      </div>
                      {recentSearches.map((term) => {
                        const globalIdx = flatItems.findIndex(i => i.type === 'recent' && i.term === term);
                        return (
                          <div
                            key={term}
                            id={`search-option-${globalIdx}`}
                            data-index={globalIdx}
                            onMouseEnter={() => setFocusedIndex(globalIdx)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-start transition-colors duration-100',
                              focusedIndex === globalIdx ? 'bg-primary/10' : 'hover:bg-accent/60'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleRecentClick(term)}
                              className="flex flex-1 items-center gap-3 min-w-0"
                            >
                              <Clock className="size-3.5 text-muted-foreground/50 shrink-0" />
                              <span className="text-sm text-foreground truncate">{term}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRecentClear(e, term)}
                              className="shrink-0 rounded-md p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                              aria-label={`حذف جستجوی «${term}»`}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Popular Categories */}
                  {apiCategories.length > 0 && (
                    <div className={recentSearches.length > 0 ? 'border-t border-border/30 pt-2' : ''}>
                      <p className="mb-1.5 px-3 pt-1 flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                        <TrendingUp className="size-3" />
                        دسته‌بندی‌های محبوب
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-2">
                        {apiCategories.slice(0, 8).map((cat) => {
                          const Icon = getCategoryIcon(cat.icon);
                          const globalIdx = flatItems.findIndex(i => i.type === 'popular' && i.id === cat.id);
                          return (
                            <button
                              key={cat.id}
                              id={`search-option-${globalIdx}`}
                              data-index={globalIdx}
                              type="button"
                              onClick={() => handleSelectSuggestion(cat)}
                              onMouseEnter={() => setFocusedIndex(globalIdx)}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                                focusedIndex === globalIdx
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'border-border/50 bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:border-primary/20 hover:text-primary'
                              )}
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

          {/* Keyboard hint */}
          {flatItems.length > 0 && (
            <div className="flex items-center gap-3 border-t border-border/30 px-3 py-2 text-caption text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px]">↑↓</kbd>
                <span>ناوبری</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px]">↵</kbd>
                <span>انتخاب</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[9px]">Esc</kbd>
                <span>بستن</span>
              </span>
            </div>
          )}
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
