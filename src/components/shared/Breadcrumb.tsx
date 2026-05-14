'use client';

import { useMemo } from 'react';
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

// ── View → SEO path mapping ────────────────────────────────────────────
const VIEW_HREF: Record<AppView, string> = {
  'home': '/',
  'login': '/login',
  'register': '/register',
  'post-need': '/post-need',
  'browse-requests': '/browse-requests',
  'request-detail': '/request-detail',
  'browse-specialists': '/browse-specialists',
  'specialist-profile': '/specialist-profile',
  'dashboard': '/dashboard',
  'messages': '/messages',
  'notifications': '/notifications',
  'admin': '/admin',
  'profile': '/profile',
  'pricing': '/pricing',
  'compare-specialists': '/compare-specialists',
  'submit-proposal': '/submit-proposal',
  'submit-review': '/submit-review',
  'referral': '/referral',
  'notification-settings': '/notification-settings',
};

// ── Breadcrumb mapping for each AppView ──────────────────────────────────
const BREADCRUMB_MAP: Record<AppView, { label: string; parent?: AppView }> = {
  'home': { label: 'صفحه اصلی' },
  'login': { label: 'ورود', parent: 'home' },
  'register': { label: 'ثبت‌نام', parent: 'home' },
  'post-need': { label: 'ثبت نیاز', parent: 'home' },
  'browse-requests': { label: 'نیازهای ثبت شده', parent: 'home' },
  'request-detail': { label: 'جزئیات نیاز', parent: 'browse-requests' },
  'submit-proposal': { label: 'ارسال پیشنهاد', parent: 'browse-requests' },
  'browse-specialists': { label: 'کسب‌وکارها', parent: 'home' },
  'specialist-profile': { label: 'پروفایل کسب‌وکار', parent: 'browse-specialists' },
  'submit-review': { label: 'ثبت نظر', parent: 'browse-specialists' },
  'compare-specialists': { label: 'مقایسه کسب‌وکارها', parent: 'browse-specialists' },
  'dashboard': { label: 'داشبورد', parent: 'home' },
  'admin': { label: 'پنل مدیریت', parent: 'home' },
  'profile': { label: 'پروفایل من', parent: 'home' },
  'messages': { label: 'پیام‌ها', parent: 'home' },
  'notifications': { label: 'اعلان‌ها', parent: 'home' },
  'pricing': { label: 'تعرفه‌ها', parent: 'home' },
  'referral': { label: 'دعوت از دوستان', parent: 'home' },
  'notification-settings': { label: 'تنظیمات اعلان‌ها', parent: 'dashboard' },
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

    // Prepend home if not already present
    if (path.length > 0 && path[0] !== 'home') {
      path.unshift('home');
    }

    return path.map((v, index) => ({
      view: v,
      label: BREADCRUMB_MAP[v].label,
      href: VIEW_HREF[v],
      position: index + 1,
      isLast: v === currentView,
    }));
  }, [currentView]);

  return (
    <BreadcrumbNav
      dir="rtl"
      itemscope
      itemtype="https://schema.org/BreadcrumbList"
    >
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2">
        {crumbs.map((crumb, index) => {
          const showSeparator = index < crumbs.length - 1;

          return (
            <span key={crumb.view} className="contents">
              <BreadcrumbItem
                className="inline-flex items-center gap-1.5"
                itemprop="itemListElement"
                itemscope
                itemtype="https://schema.org/ListItem"
              >
                {crumb.isLast ? (
                  <BreadcrumbPage className="text-primary font-medium">
                    <span itemprop="name">{crumb.label}</span>
                    <meta itemprop="position" content={String(crumb.position)} />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="text-muted-foreground hover:text-primary transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    onClick={() => navigateTo(crumb.view)}
                    data-href={crumb.href}
                    itemprop="item"
                    href={crumb.href}
                  >
                    <span itemprop="name">
                      {crumb.view === 'home' ? (
                        <span className="flex items-center gap-1.5">
                          <Home className="size-4" />
                          {crumb.label}
                        </span>
                      ) : (
                        crumb.label
                      )}
                    </span>
                    <meta itemprop="position" content={String(crumb.position)} />
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {showSeparator && (
                <BreadcrumbItem role="presentation" aria-hidden="true">
                  <BreadcrumbSeparator>
                    <ChevronLeft className="size-3.5 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                </BreadcrumbItem>
              )}
            </span>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbNav>
  );
}
