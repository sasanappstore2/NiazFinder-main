'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  MapPin,
  DollarSign,
  Flame,
  Clock,
  ChevronDown,
  Loader2,
  Sparkles,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import {
  formatBudgetRange,
  getTimeAgo,
} from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { getCategoryColor } from '@/components/layout/CategoryMegaMenu';
import { getCategoryAppearance, getAvatarColor, CATEGORY_APPEARANCE as SHARED_CATEGORY_APPEARANCE } from '@/lib/category-appearance';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { QuickViewPopover, useQuickView } from '@/components/shared/QuickView';


// ─── Fibonacci Design Tokens ───────────────────────────
// Based on Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
// Scaled for UI: 4, 6, 10, 16, 26, 42
const PHI = 1.618;
const FIB = {
  spacing: { xs: 4, sm: 6, md: 10, lg: 16, xl: 26, '2xl': 42 },
  radius: { sm: 6, md: 10, lg: 16, xl: 26, full: 9999 },
  fontSize: { xs: 10, sm: 12, base: 14, md: 15, lg: 18 },
  iconSize: { sm: 14, md: 18, lg: 24, xl: 32 },
  accent: 4, // Left accent strip width
};

// ─── Priority Configuration ───────────────────────────
const PRIORITY_CONFIG: Record<string, {
  label: string;
  className: string;
  badgeClass: string;
  icon: typeof Flame;
  glowClass: string;
  accentGradient: string;
}> = {
  URGENT: {
    label: 'فوری',
    icon: Zap,
    className: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60',
    glowClass: 'shadow-red-500/[0.08] hover:shadow-red-500/[0.15]',
    accentGradient: 'from-red-500 via-orange-500 to-amber-500',
  },
  HIGH: {
    label: 'زیاد',
    icon: Flame,
    className: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60',
    glowClass: 'shadow-amber-500/[0.06] hover:shadow-amber-500/[0.12]',
    accentGradient: 'from-amber-500 via-orange-400 to-yellow-500',
  },
  NORMAL: {
    label: 'عادی',
    icon: Clock,
    className: 'text-muted-foreground',
    badgeClass: 'bg-muted/80 text-muted-foreground border-border/60',
    glowClass: '',
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  LOW: {
    label: 'کم',
    icon: Clock,
    className: 'text-muted-foreground/70',
    badgeClass: 'bg-muted/50 text-muted-foreground border-border/40',
    glowClass: '',
    accentGradient: 'from-slate-400 via-gray-400 to-zinc-400',
  },
};

// ─── Priority Badge ───────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold tabular-nums tracking-tight',
        config.badgeClass
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

// ─── Skeleton Card ───────────────────────────
function SkeletonCard() {
  return (
    <div className="relative flex overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm">
      {/* Accent strip skeleton */}
      <div className="w-1 shrink-0 bg-muted animate-pulse" />
      <div className="flex flex-1 items-center gap-4 p-4 sm:gap-5 sm:p-5">
        {/* Icon skeleton */}
        <div className="hidden sm:block shrink-0 rounded-xl bg-muted animate-pulse" style={{ width: FIB.iconSize.xl, height: FIB.iconSize.xl }} />
        <div className="flex flex-1 flex-col gap-2.5 min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-4 w-52 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-14 rounded-lg bg-muted animate-pulse shrink-0" />
          </div>
          <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded-lg bg-muted animate-pulse" />
            <div className="h-6 w-28 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
        <div className="hidden sm:flex shrink-0 flex-col items-end gap-2 border-s border-border/30 ps-4 pe-1">
          <div className="size-8 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Request Card (Fibonacci Golden Ratio Design) ─────────────
function RequestCard({ request, isNew, onQuickView }: { request: ServiceRequest; isNew?: boolean; onQuickView?: (req: ServiceRequest, e: React.MouseEvent) => void }) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const fullName = `${request.user.firstName} ${request.user.lastName}`;
  const initials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(fullName);
  // Resolve icon & color from category name (guaranteed match)
  const catAppearance = getCategoryAppearance(request.categoryName);
  const CategoryIcon = catAppearance.icon;
  const categoryColor = catAppearance.color;
  // Fallback to mega-menu slug-based color if categoryName didn't match
  const megaMenuColor = getCategoryColor(request.categoryId);
  const resolvedColor = SHARED_CATEGORY_APPEARANCE[request.categoryName ?? ''] ? categoryColor : megaMenuColor;
  const priorityConfig = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.NORMAL;
  const isUrgent = request.priority === 'URGENT';

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      }}
      layout
    >
      <div
        role="article"
        data-href={`/requests/${request.id}`}
        onClick={(e) => {
          navigateTo('request-detail', { id: request.id });
          onQuickView?.(request, e);
        }}
        className={cn(
          'group relative flex cursor-pointer overflow-hidden rounded-2xl border',
          'bg-card/70 backdrop-blur-sm',
          'transition-all duration-300 ease-out',
          // Hover effects
          'hover:bg-card/95 hover:backdrop-blur-md',
          'hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/[0.2]',
          'hover:-translate-y-[1px] hover:scale-[1.005]',
          // Priority glow + category border glow
          priorityConfig.glowClass,
          // Category color hover glow
          `hover:shadow-[0_0_0_1px_${resolvedColor}18,0_0_16px_${resolvedColor}0d]`,
          // New item glow
          isNew && 'shadow-md shadow-emerald-500/[0.10] dark:shadow-emerald-400/[0.08]',
          isNew ? 'border-emerald-300/50 dark:border-emerald-700/40' : 'border-border/40 hover:border-border/60',
          isUrgent && !isNew && 'border-red-200/40 dark:border-red-900/30',
        )}
        title={`${request.title} - ${request.categoryName} - ${request.city || 'بدون شهر'}`}
      >
        {/* ── Right Accent Strip (Vibrant Category Gradient) ── */}
        <div
          className="shrink-0 transition-all duration-300 group-hover:w-[6px]"
          style={{
            width: '4px',
            background: `linear-gradient(to bottom, ${resolvedColor}, ${resolvedColor}cc)`,
          }}
        />

        {/* ── Pulse indicator for urgent ── */}
        {isUrgent && (
          <div className="absolute top-5 start-5 z-10">
            <span className="relative flex size-2.5">
              <span className="absolute inset-0 inline-flex size-full animate-ping rounded-full bg-red-400 opacity-50" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500 ring-2 ring-red-100 dark:ring-red-900/40" />
            </span>
          </div>
        )}

        {/* ── New shimmer overlay ── */}
        {isNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-100/20 via-transparent to-emerald-100/10 dark:from-emerald-400/5 dark:via-transparent dark:to-emerald-400/5" />
          </motion.div>
        )}

        {/* ── Card Body ── */}
        <div className="relative z-10 flex flex-1 items-stretch">
          {/* ── Category Icon Zone ── */}
          <div className="hidden sm:flex shrink-0 items-center justify-center ps-5 pe-3 self-center">
            <div
              className="relative flex items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105"
              style={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${resolvedColor}14, ${resolvedColor}08)`,
                border: `1.5px solid ${resolvedColor}25`,
              }}
            >
              <CategoryIcon
                className="transition-transform duration-200 group-hover:scale-110"
                style={{ width: 24, height: 24, color: resolvedColor }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="flex flex-1 flex-col justify-center gap-2 py-5 sm:py-6 pe-2 min-w-0">
            {/* ── Top Row: New badge + Title + Priority ── */}
            <div className="flex items-center gap-2.5 min-w-0">
              {isNew && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/40 shrink-0"
                >
                  <Sparkles className="size-3" />
                  جدید
                </motion.span>
              )}

              {/* Mobile category pill */}
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold sm:hidden shrink-0 ring-1"
                style={{
                  backgroundColor: `${resolvedColor}12`,
                  color: resolvedColor,
                  borderColor: `${resolvedColor}25`,
                }}
              >
                <CategoryIcon style={{ width: 12, height: 12 }} aria-hidden="true" />
                {request.categoryName}
              </span>

              <h2
                className={cn(
                  'flex-1 min-w-0 truncate font-extrabold leading-snug transition-colors duration-200',
                  'text-[15px] sm:text-[17px] tracking-tight',
                  isUrgent
                    ? 'text-foreground group-hover:text-red-600 dark:group-hover:text-red-400'
                    : 'text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                )}
              >
                {request.title}
              </h2>

              <PriorityBadge priority={request.priority} />
            </div>

            {/* ── Description ── */}
            <p className="text-[13px] sm:text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">
              {request.description}
            </p>

            {/* ── Meta Pills Row ── */}
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              {/* Budget Pill */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
                  'text-[11px] font-semibold tabular-nums',
                  'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                  'ring-1 ring-emerald-200/40 dark:ring-emerald-800/30',
                  'transition-all duration-200 group-hover:ring-emerald-300/60 dark:group-hover:ring-emerald-700/50',
                )}
              >
                <DollarSign className="size-3.5 shrink-0" aria-hidden="true" />
                {formatBudgetRange(request.budgetMin, request.budgetMax)}
              </span>

              {/* City Pill */}
              {request.city && (
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40 ring-1 ring-border/20">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {request.city}
                </span>
              )}

              {/* Category pill (desktop) */}
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1"
                style={{
                  backgroundColor: `${resolvedColor}0A`,
                  color: resolvedColor,
                  borderColor: `${resolvedColor}18`,
                }}
              >
                <CategoryIcon style={{ width: 13, height: 13 }} aria-hidden="true" />
                {request.categoryName}
              </span>
            </div>
          </div>

          {/* ── Left Side: User + Time (RTL: Left visual side) ── */}
          <div className="hidden sm:flex shrink-0 flex-col items-center justify-center gap-2.5 ps-4 pe-5"
            style={{ borderInlineStart: `1px solid ${resolvedColor}15` }}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-full ring-2 transition-all duration-200',
                'group-hover:scale-105',
                `ring-white dark:ring-card ${colorClass}`,
              )}
              style={{ width: 36, height: 36 }}
              title={fullName}
            >
              <span className="text-[11px] font-bold">{initials}</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground/60">
              {isNew ? 'همین الان' : getTimeAgo(request.createdAt)}
            </span>
          </div>
        </div>

        {/* ── Hover Arrow Indicator ── */}
        <div className="absolute bottom-5 start-5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowUpRight
            className="size-4 text-muted-foreground/40"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Polling interval (15 seconds) ─────────────────────
const POLL_INTERVAL = 15_000;

// ─── Empty State ───────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative mb-6">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted/80 to-muted/40">
          <Search className="size-9 text-muted-foreground/30" aria-hidden="true" />
        </div>
        <div className="absolute -bottom-1 -end-1 size-7 rounded-xl bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/30">
          <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <h2 className="mb-2 text-lg font-bold text-foreground/80">نیازی یافت نشد</h2>
      <p className="mx-auto max-w-xs text-sm text-muted-foreground/60 leading-relaxed text-center">
        در حال حاضر نیازی ثبت نشده است.
        <br />
        اولین نفر باشید که نیاز خود را ثبت می‌کند!
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export function NeedsHomepage() {
  const fetchRequests = useAppStore((s) => s.fetchRequests);
  const storeRequests = useAppStore((s) => s.requests);
  const isLoading = useAppStore((s) => s.isLoading);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [localRequests, setLocalRequests] = useState<ServiceRequest[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const lastFetchTimeRef = useRef<number>(Date.now());
  const { quickView, showQuickView, closeQuickView } = useQuickView();

  // Initial fetch
  const loadRequests = useCallback(async (pageNum: number) => {
    const params: Record<string, string> = { limit: '12', page: String(pageNum), status: 'OPEN' };
    try {
      await fetchRequests(params);
      const response = await fetch(`/api/requests?${new URLSearchParams(params).toString()}`);
      const data = await response.json();
      setTotalPages(data.pagination?.totalPages || 1);
      lastFetchTimeRef.current = Date.now();
      return data.requests || [];
    } catch {
      return [];
    }
  }, [fetchRequests]);

  // Initial load
  useEffect(() => {
    setInitialLoading(true);
    loadRequests(page).then((reqs) => {
      setLocalRequests(reqs);
      setInitialLoading(false);
    });
  }, [page, loadRequests]);

  // Polling for new requests
  useEffect(() => {
    if (initialLoading) return;

    const interval = setInterval(async () => {
      try {
        const params: Record<string, string> = {
          limit: '5',
          page: '1',
          status: 'OPEN',
          sort: 'newest',
        };
        const response = await fetch(
          `/api/requests?${new URLSearchParams(params).toString()}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        const latestRequests: ServiceRequest[] = data.requests || [];

        if (latestRequests.length > 0) {
          setLocalRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const trulyNew = latestRequests.filter(
              (r) => !existingIds.has(r.id)
            );

            if (trulyNew.length === 0) return prev;

            // Mark new IDs
            setNewIds((prevIds) => {
              const next = new Set(prevIds);
              trulyNew.forEach((r) => next.add(r.id));
              // Remove "new" badge after 30 seconds
              setTimeout(() => {
                setNewIds((current) => {
                  const updated = new Set(current);
                  trulyNew.forEach((r) => updated.delete(r.id));
                  return updated;
                });
              }, 30_000);
              return next;
            });

            // Add new items to the top
            return [...trulyNew, ...prev].slice(0, 60);
          });

          lastFetchTimeRef.current = Date.now();
        }
      } catch {
        // Silently fail on polling errors
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [initialLoading]);

  // Display list: use localRequests if populated, fallback to store
  const displayRequests = localRequests.length > 0 ? localRequests : storeRequests;

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container-default mx-auto px-5 md:px-8 pt-6 pb-12">
        {/* Results */}
        {initialLoading ? (
          <div className="flex flex-col gap-3" itemscope itemtype="https://schema.org/ItemList">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : displayRequests.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div
              className="flex flex-col gap-3"
              itemscope
              itemtype="https://schema.org/ItemList"
            >
              <meta itemprop="numberOfItems" content={String(displayRequests.length)} />
              <meta itemprop="name" content="نیازهای ثبت شده در نیاز فایندر" />
              <AnimatePresence initial={false}>
                {displayRequests.map((request) => (
                  <div key={request.id} itemprop="itemListElement">
                    <RequestCard request={request} isNew={newIds.has(request.id)} onQuickView={showQuickView} />
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                  className="rounded-2xl px-10 font-medium transition-all duration-200 hover:shadow-md"
                  title="نمایش نیازهای بیشتر"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      در حال بارگذاری...
                    </>
                  ) : (
                    <>
                      نمایش بیشتر
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Pagination info */}
            {totalPages > 1 && (
              <p className="mt-6 text-center text-xs text-muted-foreground/50 tabular-nums">
                صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </p>
            )}
          </>
        )}
      </div>

      {/* Quick View Popover */}
      {quickView && (
        <QuickViewPopover
          request={quickView.request}
          anchorRect={quickView.anchorRect}
          onClose={closeQuickView}
        />
      )}

      <noscript>
        <div className="sr-only" itemscope itemtype="https://schema.org/ItemList">
          <h1>نیازهای ثبت شده در نیاز فایندر</h1>
          <p>فهرست نیازهای خدمات ثبت شده توسط کاربران.</p>
        </div>
      </noscript>
    </div>
  );
}
