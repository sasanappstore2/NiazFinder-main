'use client';

import { useState, useMemo } from 'react';
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
  LayoutGrid,
  List,
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
    <div className="flex items-center gap-0.5" aria-label={`امتیاز ${rating.toLocaleString('fa-IR')} از ۵`}>
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
          aria-hidden="true"
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
    <div className="flex gap-0.5" aria-label={`سطح مهارت: ${level} از ۵`} aria-hidden="true">
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

// ─── Specialist Card (Grid Mode) ──────────────────────────
function SpecialistCard({ specialist, onViewProfile }: { specialist: SpecialistProfile; onViewProfile: () => void }) {
  const { toggleCompareSpecialist, compareSpecialistIds, navigateTo } = useAppStore();
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');
  const isCompared = compareSpecialistIds.includes(specialist.id);

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={`/specialists/${specialist.id}`}>
      <CardContent className="p-6">
        {/* Top: Avatar + Name + Actions */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-primary/20 ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-label="آنلاین" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold">{specialist.displayName}</h2>
              {specialist.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label="احراز هویت شده" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
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
              aria-label={`${isCompared ? 'حذف از مقایسه' : 'افزودن به مقایسه'} ${specialist.displayName}`}
            >
              <GitCompareArrows className="size-4" aria-hidden="true" />
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
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3.5 ring-1 ring-border/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" aria-hidden="true" />
            <div>
              <span className="text-xs text-muted-foreground">تکمیل</span>
              <p className="text-xs font-bold">{specialist.completionRate.toLocaleString('fa-IR')}٪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-500" aria-hidden="true" />
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
            aria-label={`مشاهده پروفایل ${specialist.displayName}`}
          >
            مشاهده پروفایل
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            onClick={() => navigateTo('messages')}
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-xl"
            aria-label={`ارسال پیام به ${specialist.displayName}`}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Specialist Card (List Mode) ──────────────────────────
function SpecialistListCard({ specialist, onViewProfile }: { specialist: SpecialistProfile; onViewProfile: () => void }) {
  const { toggleCompareSpecialist, compareSpecialistIds, navigateTo } = useAppStore();
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');
  const isCompared = compareSpecialistIds.includes(specialist.id);

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={`/specialists/${specialist.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Avatar on right */}
          <div className="relative shrink-0">
            <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-primary/20 ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-label="آنلاین" />
            )}
          </div>

          {/* Name + Bio + Skills - center */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold">{specialist.displayName}</h2>
              {specialist.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label="احراز هویت شده" />
              )}
            </div>
            {specialist.bio && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {specialist.bio}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specialist.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill.name}
                  variant="secondary"
                  className="rounded-md bg-primary/5 text-[10px] font-medium text-foreground hover:bg-primary/10"
                >
                  {skill.name}
                </Badge>
              ))}
              {specialist.skills.length > 4 && (
                <Badge variant="outline" className="rounded-md text-[10px]">
                  +{specialist.skills.length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats column - hidden on small screens */}
          <div className="hidden shrink-0 flex-col items-center gap-2 lg:flex">
            <div className="text-center">
              <RatingStars rating={specialist.rating} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3" aria-hidden="true" />
                {specialist.projectCount.toLocaleString('fa-IR')}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-500" aria-hidden="true" />
                {specialist.completionRate.toLocaleString('fa-IR')}٪
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {specialist.city}
            </div>
          </div>

          {/* CTA buttons on left */}
          <div className="flex shrink-0 items-center gap-2">
            <BookmarkButton id={specialist.id} type="specialist" size="sm" />
            <Button
              onClick={onViewProfile}
              variant="outline"
              className="h-9 rounded-lg px-3 text-xs font-medium"
              aria-label={`مشاهده پروفایل ${specialist.displayName}`}
            >
              پروفایل
              <ArrowLeft className="size-3" aria-hidden="true" />
            </Button>
            <Button
              onClick={() => navigateTo('messages')}
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label={`ارسال پیام به ${specialist.displayName}`}
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleCompareSpecialist(specialist.id); }}
              className={`rounded-lg p-1.5 transition-colors ${isCompared ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-label={`${isCompared ? 'حذف از مقایسه' : 'افزودن به مقایسه'} ${specialist.displayName}`}
            >
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
            </button>
          </div>
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
    <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2" role="status" aria-label={`${count} کسب‌وکار برای مقایسه انتخاب شده`}>
      <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/95 px-5 py-3 shadow-2xl backdrop-blur-xl ring-1 ring-black/5">
        <GitCompareArrows className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">
          {count.toLocaleString('fa-IR')} کسب‌وکار انتخاب شده
        </span>
        {count >= 2 && (
          <Button
            size="sm"
            onClick={() => navigateTo('compare-specialists')}
            className="rounded-lg"
            data-href="/specialists/compare"
            aria-label="مقایسه کسب‌وکارها"
          >
            مقایسه کنید
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={clearCompareList} className="text-xs text-muted-foreground" aria-label="پاک کردن لیست مقایسه" title="پاک کردن لیست مقایسه کسب‌وکارها">
          پاک کردن
        </Button>
      </div>
    </div>
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const activeFilterCount = [
    query,
    skillFilter,
    cityFilter !== 'all' ? cityFilter : '',
  ].filter(Boolean).length;

  // Filter & sort
  const filteredSpecialists = useMemo(() => {
    let results = [...MOCK_SPECIALISTS];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.displayName?.toLowerCase().includes(q) ||
          s.bio?.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.name.toLowerCase().includes(q))
      );
    }

    if (skillFilter.trim()) {
      const sk = skillFilter.trim().toLowerCase();
      results = results.filter((s) =>
        s.skills.some((skill) => skill.name.toLowerCase().includes(sk))
      );
    }

    if (cityFilter !== 'all') {
      results = results.filter((s) => s.city === cityFilter);
    }

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
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                کسب‌وکارها
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {filteredSpecialists.length.toLocaleString('fa-IR')} کسب‌وکار یافت شد
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-lg border border-border/40 shadow-sm" role="radiogroup" aria-label="نحوه نمایش">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center justify-center p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  aria-label="نمای شبکه‌ای"
                  role="radio"
                  aria-checked={viewMode === 'grid'}
                  title="نمایش به صورت شبکه‌ای"
                >
                  <LayoutGrid className="size-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  aria-label="نمای لیستی"
                  role="radio"
                  aria-checked={viewMode === 'list'}
                  title="نمایش به صورت لیستی"
                >
                  <List className="size-4" aria-hidden="true" />
                </button>
              </div>
              {/* Filter button */}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="gap-2"
                aria-label="نمایش فیلترها"
                title="نمایش و مخفی کردن فیلترهای جستجوی کسب‌وکارها"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                فیلترها
                {activeFilterCount > 0 && (
                  <Badge className="mr-1 size-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="جستجوی نام، تخصص یا مهارت..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جستجوی کسب‌وکارها"
              className="h-12 w-full rounded-xl border-border/50 bg-card/80 backdrop-blur-sm pr-10 text-sm shadow-md shadow-black/[0.03] focus-visible:shadow-lg focus-visible:shadow-emerald-500/[0.06] focus-visible:border-emerald-300/50 dark:focus-visible:border-emerald-700/50 transition-shadow"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="پاک کردن جستجو"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable filter row */}
        {showFilters && (
          <div className="mb-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/[0.03]">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Skill filter */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="skill-filter">
                      مهارت
                    </label>
                    <div className="relative">
                      <Input
                        id="skill-filter"
                        placeholder="مثلاً React، طراحی..."
                        value={skillFilter}
                        onChange={(e) => setSkillFilter(e.target.value)}
                        className="h-9 w-full rounded-lg text-sm"
                        aria-label="فیلتر مهارت"
                      />
                      {skillFilter && (
                        <button
                          onClick={() => setSkillFilter('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="پاک کردن فیلتر مهارت"
                          title="پاک کردن فیلتر مهارت"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="city-filter">
                      شهر
                    </label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-full rounded-lg" id="city-filter">
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
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="sort-filter">
                      مرتب‌سازی
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full rounded-lg" id="sort-filter">
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
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground" aria-label="حذف همه فیلترها">
                      <X className="size-3" aria-hidden="true" />
                      حذف همه فیلترها
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active filter chips when filters panel is closed */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2" role="list" aria-label="فیلترهای فعال">
            {skillFilter && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                {skillFilter}
                <button onClick={() => setSkillFilter('')} aria-label="حذف فیلتر مهارت"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {cityFilter}
                <button onClick={() => setCityFilter('all')} aria-label="حذف فیلتر شهر"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground" title="حذف همه فیلترهای فعال">
              حذف همه
            </Button>
          </div>
        )}

        {/* Results */}
        {filteredSpecialists.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted" aria-hidden="true">
              <Search className="size-8 text-muted-foreground/50" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">کسب‌وکاری یافت نشد</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters} title="حذف فیلترها و نمایش همه کسب‌وکارها">
              حذف فیلترها
            </Button>
          </div>
        ) : (
          <>
            <div
              key={`${query}-${skillFilter}-${cityFilter}-${sortBy}-${viewMode}`}
              className={viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-4'
              }
              itemscope
              itemtype="https://schema.org/ItemList"
            >
              <meta itemprop="numberOfItems" content={String(filteredSpecialists.length)} />
              <meta itemprop="name" content="فهرست کسب‌وکارها در نیاز فایندر" />
              {visibleSpecialists.map((specialist) => (
                <div key={specialist.id} itemprop="itemListElement">
                  {viewMode === 'grid' ? (
                    <SpecialistCard
                      specialist={specialist}
                      onViewProfile={() => navigateTo('specialist-profile', { id: specialist.id })}
                    />
                  ) : (
                    <SpecialistListCard
                      specialist={specialist}
                      onViewProfile={() => navigateTo('specialist-profile', { id: specialist.id })}
                    />
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="rounded-xl px-8"
                  aria-label="نمایش بیشتر"
                  data-href="/browse-specialists"
                  title="نمایش کسب‌وکارهای بیشتر"
                >
                  نمایش بیشتر
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Compare Bar */}
      <CompareBar />

      <noscript>
        <div className="sr-only" itemscope itemtype="https://schema.org/ItemList">
          <h1>فهرست کسب‌وکارها در نیاز فایندر</h1>
          <p>فهرست کسب‌وکارهای خدمات ثبت شده در پلتفرم. شامل کسب‌وکارهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
    </div>
  );
}
