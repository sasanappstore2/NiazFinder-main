'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  BadgeCheck,
  ArrowLeft,
  Briefcase,
  TrendingUp,
  MessageSquare,
  X,
  ChevronDown,
  SlidersHorizontal,
  GitCompareArrows,
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
import { useAppStore } from '@/lib/store';
import { MOCK_SPECIALISTS, CITIES } from '@/lib/constants';
import type { SpecialistProfile } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { SpecialistAvailabilityBadge } from '@/components/specialists/SpecialistAvailabilityBadge';

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

// ─── Sort options ─────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'rating', label: 'بالاترین امتیاز' },
  { value: 'projects', label: 'بیشترین پروژه' },
  { value: 'newest', label: 'جدیدترین عضو' },
];

// ─── Rating stars ─────────────────────────────────────
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        {rating.toLocaleString('fa-IR')}
      </span>
    </div>
  );
}

// ─── Skill level dots ─────────────────────────────────
function SkillLevelDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i < level ? 'bg-emerald-500' : 'bg-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Specialist Card ──────────────────────────────────
function SpecialistCard({ specialist, onViewProfile }: { specialist: SpecialistProfile; onViewProfile: () => void }) {
  const { toggleCompareSpecialist, compareSpecialistIds, navigateTo } = useAppStore();
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName);
  const isCompared = compareSpecialistIds.includes(specialist.id);

  return (
    <Card className="group border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800">
      <CardContent className="p-6">
        {/* Top: Avatar + Name + Actions */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-primary/20 ${colorClass}`}>
              {initials}
            </div>
            {/* Online indicator */}
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold">{specialist.displayName}</h3>
              {specialist.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {specialist.city}
            </div>
            <div className="mt-1">
              <SpecialistAvailabilityBadge
                isOnline={specialist.online}
                responseTime={specialist.responseTime}
                size="sm"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <BookmarkButton id={specialist.id} type="specialist" size="sm" />
            <button
              onClick={(e) => { e.stopPropagation(); toggleCompareSpecialist(specialist.id); }}
              className={`rounded-lg p-1.5 transition-colors ${isCompared ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-label="مقایسه"
            >
              <GitCompareArrows className="size-4" />
            </button>
          </div>
        </div>

        {/* Rating + Projects */}
        <div className="mb-4 flex items-center justify-between">
          <RatingStars rating={specialist.rating} />
          <span className="text-xs text-muted-foreground">
            {specialist.projectCount.toLocaleString('fa-IR')} پروژه
          </span>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {specialist.skills.slice(0, 3).map((skill) => (
              <Badge
                key={skill.name}
                variant="secondary"
                className="rounded-lg bg-primary/5 text-[11px] font-medium text-foreground hover:bg-primary/10"
              >
                {skill.name}
                <SkillLevelDots level={skill.level} />
              </Badge>
            ))}
            {specialist.skills.length > 3 && (
              <Badge variant="outline" className="rounded-lg text-[11px]">
                +{specialist.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            <div>
              <span className="text-xs text-muted-foreground">تکمیل</span>
              <p className="text-xs font-bold">{specialist.completionRate.toLocaleString('fa-IR')}٪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-500" />
            <div>
              <span className="text-xs text-muted-foreground">پاسخ‌دهی</span>
              <p className="text-xs font-bold">{specialist.responseRate.toLocaleString('fa-IR')}٪</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            onClick={onViewProfile}
            variant="outline"
            className="h-10 flex-1 rounded-xl text-sm font-medium"
          >
            مشاهده پروفایل
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            onClick={() => navigateTo('messages')}
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            <MessageSquare className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Floating Compare Bar ─────────────────────────────
function CompareBar() {
  const { compareSpecialistIds, navigateTo, clearCompareList } = useAppStore();
  const count = compareSpecialistIds.length;

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-5 py-3 shadow-xl backdrop-blur-xl">
        <GitCompareArrows className="size-5 text-primary" />
        <span className="text-sm font-medium">
          {count.toLocaleString('fa-IR')} متخصص انتخاب شده
        </span>
        {count >= 2 && (
          <Button
            size="sm"
            onClick={() => navigateTo('compare-specialists')}
            className="rounded-lg"
          >
            مقایسه کنید
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={clearCompareList} className="text-xs text-muted-foreground">
          پاک کردن
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────
export function BrowseSpecialists() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Filters state
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [visibleCount, setVisibleCount] = useState(6);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    query,
    skillFilter,
    cityFilter !== 'all' ? cityFilter : '',
  ].filter(Boolean).length;

  // Filter & sort
  const filteredSpecialists = useMemo(() => {
    let results = [...MOCK_SPECIALISTS];

    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.bio?.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.name.toLowerCase().includes(q))
      );
    }

    // Skill filter
    if (skillFilter.trim()) {
      const sk = skillFilter.trim().toLowerCase();
      results = results.filter((s) =>
        s.skills.some((skill) => skill.name.toLowerCase().includes(sk))
      );
    }

    // City filter
    if (cityFilter !== 'all') {
      results = results.filter((s) => s.city === cityFilter);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'projects':
        results.sort((a, b) => b.projectCount - a.projectCount);
        break;
      case 'newest':
        results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return results;
  }, [query, skillFilter, cityFilter, sortBy]);

  const visibleSpecialists = filteredSpecialists.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSpecialists.length;

  const clearFilters = () => {
    setQuery('');
    setSkillFilter('');
    setCityFilter('all');
    setSortBy('rating');
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
                متخصص‌ها
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredSpecialists.length.toLocaleString('fa-IR')} متخصص یافت شد
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

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی نام، تخصص یا مهارت..."
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Skill filter */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      مهارت
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="مثلاً React، طراحی..."
                        value={skillFilter}
                        onChange={(e) => setSkillFilter(e.target.value)}
                        className="h-9 w-full rounded-lg text-sm"
                      />
                      {skillFilter && (
                        <button
                          onClick={() => setSkillFilter('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
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
            {skillFilter && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5">
                {skillFilter}
                <button onClick={() => setSkillFilter('')}><X className="size-3" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5">
                <MapPin className="size-3" />
                {cityFilter}
                <button onClick={() => setCityFilter('all')}><X className="size-3" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
              حذف همه
            </Button>
          </motion.div>
        )}

        {/* Results */}
        {filteredSpecialists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center"
          >
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">متخصصی یافت نشد</h3>
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
              key={`${query}-${skillFilter}-${cityFilter}-${sortBy}`}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleSpecialists.map((specialist) => (
                <motion.div key={specialist.id} variants={item}>
                  <SpecialistCard
                    specialist={specialist}
                    onViewProfile={() => navigateTo('specialist-profile', { id: specialist.id })}
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

      {/* Floating Compare Bar */}
      <CompareBar />
    </div>
  );
}
