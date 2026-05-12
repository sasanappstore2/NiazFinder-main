'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Home } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';
import {
  Breadcrumb as BreadcrumbNav,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// ── Breadcrumb mapping for each AppView ──────────────────────────────────
const BREADCRUMB_MAP: Record<AppView, { label: string; parent?: AppView }> = {
  'home': { label: 'صفحه اصلی' },
  'login': { label: 'ورود', parent: 'home' },
  'register': { label: 'ثبت‌نام', parent: 'home' },
  'post-need': { label: 'ثبت نیاز', parent: 'home' },
  'browse-requests': { label: 'نیازهای ثبت شده', parent: 'home' },
  'request-detail': { label: 'جزئیات نیاز', parent: 'browse-requests' },
  'submit-proposal': { label: 'ارسال پیشنهاد', parent: 'browse-requests' },
  'browse-specialists': { label: 'متخصص‌ها', parent: 'home' },
  'specialist-profile': { label: 'پروفایل متخصص', parent: 'browse-specialists' },
  'submit-review': { label: 'ثبت نظر', parent: 'browse-specialists' },
  'compare-specialists': { label: 'مقایسه متخصص‌ها', parent: 'browse-specialists' },
  'dashboard': { label: 'داشبورد', parent: 'home' },
  'admin': { label: 'پنل مدیریت', parent: 'home' },
  'profile': { label: 'پروفایل من', parent: 'home' },
  'messages': { label: 'پیام‌ها', parent: 'home' },
  'notifications': { label: 'اعلان‌ها', parent: 'home' },
  'pricing': { label: 'تعرفه‌ها', parent: 'home' },
  'referral': { label: 'دعوت از دوستان', parent: 'home' },
  'notification-settings': { label: 'تنظیمات اعلان‌ها', parent: 'dashboard' },
};

// ── Stagger animation variants ───────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'tween' as const, ease: 'easeOut' as const, duration: 0.25 },
  },
};

// ── Breadcrumb Component ─────────────────────────────────────────────────
export function Breadcrumb() {
  const { currentView, navigateTo } = useAppStore();

  // Build the breadcrumb path by walking up the parent chain
  const crumbs = useMemo(() => {
    const path: AppView[] = [];
    let view: AppView | undefined = currentView;

    // Walk up to 4 levels deep to prevent infinite loops
    while (view && path.length < 4) {
      path.unshift(view);
      view = BREADCRUMB_MAP[view]?.parent;
    }

    return path.map((v) => ({
      view: v,
      label: BREADCRUMB_MAP[v].label,
      isLast: v === currentView,
    }));
  }, [currentView]);

  return (
    <BreadcrumbNav dir="rtl">
      <motion.ol
        className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Home icon link (always first) */}
        {crumbs[0]?.view !== 'home' && (
          <>
            <motion.li variants={itemVariants} className="inline-flex items-center gap-1.5">
              <BreadcrumbLink
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                onClick={() => navigateTo('home')}
              >
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </motion.li>
            <motion.li variants={itemVariants} role="presentation" aria-hidden="true">
              <BreadcrumbSeparator>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
              </BreadcrumbSeparator>
            </motion.li>
          </>
        )}

        {crumbs.map((crumb, index) => {
          const isLast = crumb.isLast;
          const showSeparator = index < crumbs.length - 1;

          return (
            <span key={crumb.view} className="contents">
              <motion.li variants={itemVariants} className="inline-flex items-center gap-1.5">
                {isLast ? (
                  <BreadcrumbPage className="text-primary font-medium">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    onClick={() => navigateTo(crumb.view)}
                  >
                    {crumb.view === 'home' ? (
                      <span className="flex items-center gap-1.5">
                        <Home className="h-4 w-4" />
                        {crumb.label}
                      </span>
                    ) : (
                      crumb.label
                    )}
                  </BreadcrumbLink>
                )}
              </motion.li>
              {showSeparator && (
                <motion.li variants={itemVariants} role="presentation" aria-hidden="true">
                  <BreadcrumbSeparator>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                </motion.li>
              )}
            </span>
          );
        })}
      </motion.ol>
    </BreadcrumbNav>
  );
}
