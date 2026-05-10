'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  DollarSign,
  FileText,
  Flame,
  Clock,
  ArrowUpDown,
  X,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAppStore,
} from '@/lib/store';
import {
  MOCK_REQUESTS,
  CATEGORIES,
  CITIES,
  formatBudgetRange,
  getTimeAgo,
  getPriorityLabel,
} from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

// ─── Animation variants ───────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Avatar color generator ───────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Priority badge helper ────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
    HIGH: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: Flame },
    NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  };
  const c = config[priority] || config.NORMAL;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`rounded-lg text-[11px] font-medium ${c.className}`}>
      <Icon className="size-3" />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

// ─── Budget range presets ─────────────────────────────
const BUDGET_RANGES = [
  { label: 'همه', min: 0, max: Infinity },
  { label: 'زیر ۲ میلیون تومان', min: 0, max: 2000000 },
  { label: '۲ تا ۵ میلیون تومان', min: 2000000, max: 5000000 },
  { label: '۵ تا ۱۵ میلیون تومان', min: 5000000, max: 15000000 },
  { label: '۱۵ تا ۵۰ میلیون تومان', min: 15000000, max: 50000000 },
  { label: 'بالای ۵۰ میلیون تومان', min: 50000000, max: Infinity },
];

// ─── Sort options ─────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'budget_low', label: 'بودجه: کم به زیاد' },
  { value: 'budget_high', label: 'بودجه: زیاد به کم' },
  { value: 'most_proposals', label: 'بیشترین پیشنهاد' },
];

// ─── Request Card ─────────────────────────────────────
function RequestCard({ request, onClick }: { request: ServiceRequest; onClick: () => void }) {
  const fullName = `${request.user.firstName} ${request.user.lastName}`;
  const initials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(fullName);

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800"
    >
      <CardContent className="p-5">
        {/* Top: Category + Priority + Bookmark */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{request.categoryIcon}</span>
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
              {request.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BookmarkButton id={request.id} type="request" size="sm" />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-bold leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {request.title}
        </h3>

        {/* Description */}
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {request.description}
        </p>

        {/* Meta */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="size-3.5 shrink-0 text-emerald-500" />
            <span className="truncate">{formatBudgetRange(request.budgetMin, request.budgetMax)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span>{request.city}</span>
          </div>
        </div>

        {/* Bottom: Proposals + Time + User */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            <span>{request.proposalCount.toLocaleString('fa-IR')} پیشنهاد</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{getTimeAgo(request.createdAt)}</span>
            <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${colorClass}`}>
              {initials}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────
export function BrowseRequests() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Filters state
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(6);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    query,
    categoryFilter !== 'all' ? categoryFilter : '',
    cityFilter !== 'all' ? cityFilter : '',
    budgetFilter !== 'all' ? budgetFilter : '',
  ].filter(Boolean).length;

  // Filter & sort
  const filteredRequests = useMemo(() => {
    let results = [...MOCK_REQUESTS];

    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      results = results.filter((r) => r.categoryId === categoryFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      results = results.filter((r) => r.city === cityFilter);
    }

    // Budget filter
    if (budgetFilter !== 'all') {
      const idx = Number(budgetFilter);
      const range = BUDGET_RANGES[idx];
      if (range) {
        results = results.filter((r) => {
          const max = r.budgetMax || r.budgetMin || 0;
          const min = r.budgetMin || 0;
          return min >= range.min && max <= range.max;
        });
      }
    }

    // Sort
    switch (sortBy) {
      case 'budget_low':
        results.sort((a, b) => (a.budgetMin || 0) - (b.budgetMin || 0));
        break;
      case 'budget_high':
        results.sort((a, b) => (b.budgetMax || 0) - (a.budgetMax || 0));
        break;
      case 'most_proposals':
        results.sort((a, b) => b.proposalCount - a.proposalCount);
        break;
      case 'newest':
      default:
        results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return results;
  }, [query, categoryFilter, cityFilter, budgetFilter, sortBy]);

  const visibleRequests = filteredRequests.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRequests.length;

  const clearFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setCityFilter('all');
    setBudgetFilter('all');
    setSortBy('newest');
    setVisibleCount(6);
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                نیازهای ثبت شده
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredRequests.length.toLocaleString('fa-IR')} نیاز یافت شد
              </p>
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="gap-2 self-start sm:self-auto"
            >
              <SlidersHorizontal className="size-4" />
              فیلترها
              {activeFilterCount > 0 && (
                <Badge className="mr-1 size-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Search bar — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجو در عنوان، توضیحات یا تگ‌ها..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border-border/60 bg-card pr-10 text-sm shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Expandable filter row */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Card className="border-border/60 bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Category */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      دسته‌بندی
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full rounded-lg">
                        <SelectValue placeholder="همه دسته‌بندی‌ها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      شهر
                    </label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-full rounded-lg">
                        <SelectValue placeholder="همه شهرها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه شهرها</SelectItem>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget range */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      بازه بودجه
                    </label>
                    <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                      <SelectTrigger className="w-full rounded-lg">
                        <SelectValue placeholder="همه بودجه‌ها" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGET_RANGES.map((range, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      مرتب‌سازی
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-4 flex justify-start">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                      <X className="size-3" />
                      حذف همه فیلترها
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active filter chips when filters panel is closed */}
        {!showFilters && activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex flex-wrap gap-2"
          >
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5">
                {CATEGORIES.find((c) => c.id === categoryFilter)?.name}
                <button onClick={() => setCategoryFilter('all')}><X className="size-3" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5">
                <MapPin className="size-3" />
                {cityFilter}
                <button onClick={() => setCityFilter('all')}><X className="size-3" /></button>
              </Badge>
            )}
            {budgetFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5">
                {BUDGET_RANGES[Number(budgetFilter)]?.label}
                <button onClick={() => setBudgetFilter('all')}><X className="size-3" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
              حذف همه
            </Button>
          </motion.div>
        )}

        {/* Results */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center"
          >
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">نتیجه‌ای یافت نشد</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              حذف فیلترها
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              key={`${query}-${categoryFilter}-${cityFilter}-${budgetFilter}-${sortBy}`}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleRequests.map((request) => (
                <motion.div key={request.id} variants={item}>
                  <RequestCard
                    request={request}
                    onClick={() => navigateTo('request-detail', { id: request.id })}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="rounded-xl px-8"
                >
                  نمایش بیشتر
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
