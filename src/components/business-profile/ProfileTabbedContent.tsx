'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Business, OfferCtaType, ProfileTabId, ResolvedProfileLayout } from '@/contracts/business-profile';
import {
  getSectionsForTab,
  getTabDisplayOrder,
  getTabSpecsForBusiness,
  parseProfileTabParam,
  resolveDefaultProfileTab,
  tabHasContent,
} from '@/lib/business/profile-tabs';
import { PROFILE_TABS_TO_CONTENT } from '@/components/business-profile/profile-layout-tokens';
import { cn } from '@/lib/utils';
import { renderProfileSection } from './ProfileShell';
import { ProfileTabEmpty } from './ProfilePrimaryTabs';

const EMPTY_MESSAGES: Partial<Record<ProfileTabId, string>> = {
  portfolio: 'هنوز نمونه‌کاری ثبت نشده است.',
  gallery: 'هنوز تصویری در گالری ثبت نشده است.',
  products: 'هنوز محصولی ثبت نشده است.',
  services: 'هنوز خدمتی ثبت نشده است.',
  listings: 'هنوز آگهی ثبت نشده است.',
  menu: 'هنوز منویی ثبت نشده است.',
  company: 'مشخصات شرکت هنوز تکمیل نشده است.',
  needs: 'هنوز نیازی ثبت نشده است.',
  reviews: 'هنوز نظری ثبت نشده است.',
};

function readTabFromLocation(
  business: Business,
  defaultTab: ProfileTabId
): ProfileTabId {
  if (typeof window === 'undefined') return defaultTab;
  const params = new URLSearchParams(window.location.search);
  return parseProfileTabParam(business, params.get('tab')) ?? defaultTab;
}

export function ProfileTabbedContent({
  business,
  layout,
  requestId,
  onOfferAction,
}: {
  business: Business;
  layout: ResolvedProfileLayout;
  requestId?: string;
  onOfferAction?: (offerId: string, cta: OfferCtaType) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabSpecs = useMemo(() => getTabSpecsForBusiness(business), [business]);
  const displayOrder = useMemo(() => getTabDisplayOrder(business), [business]);
  const defaultTab = useMemo(() => resolveDefaultProfileTab(business), [business]);

  const initialTab = useMemo(
    () =>
      parseProfileTabParam(business, searchParams.get('tab')) ?? defaultTab,
    [business, searchParams, defaultTab]
  );

  const [activeTab, setActiveTab] = useState<ProfileTabId>(initialTab);

  // Back/forward — do not use router.replace (Next.js strips ?tab= on soft navigation)
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(readTabFromLocation(business, defaultTab));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [business, defaultTab]);

  const handleTabChange = useCallback(
    (tab: ProfileTabId) => {
      if (tab === activeTab) return;
      setActiveTab(tab);

      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      const qs = params.toString();
      const nextUrl = `${pathname}?${qs}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [activeTab, pathname]
  );

  const sectionProps = { business, requestId, onOfferAction };
  const tabCount = tabSpecs.length;
  const useScrollableTabs = tabCount > 3;
  const gridColsClass =
    tabCount <= 1 ? 'grid-cols-1' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
  const vitrineCategoryId =
    searchParams.get('vitrineCategory') ?? searchParams.get('category');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const parsedTab = parseProfileTabParam(business, tabParam);
    if (parsedTab) {
      setActiveTab(parsedTab);
    } else if (vitrineCategoryId && tabHasContent('products', business, layout)) {
      setActiveTab('products');
    }
  }, [searchParams, business, layout, vitrineCategoryId]);

  useEffect(() => {
    if (
      searchParams.get('tab') === 'products' ||
      vitrineCategoryId
    ) {
      const t = window.setTimeout(() => {
        document.getElementById('section-products')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, [searchParams, vitrineCategoryId]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as ProfileTabId)} className="w-full">
      <TabsList
        dir="ltr"
        className={
          useScrollableTabs
            ? 'profile-primary-tabs profile-surface sticky top-(--site-header-offset,6.5rem) z-[calc(var(--z-header)-1)] flex h-auto w-full min-w-0 gap-1 overflow-x-auto rounded-xl p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : `profile-primary-tabs profile-surface sticky top-(--site-header-offset,6.5rem) z-[calc(var(--z-header)-1)] grid h-auto w-full min-w-0 ${gridColsClass} gap-1 rounded-xl p-1.5 shadow-sm`
        }
      >
        {displayOrder.map((tabId) => {
          const spec = tabSpecs.find((t) => t.id === tabId);
          if (!spec) return null;
          return (
            <TabsTrigger
              key={tabId}
              value={tabId}
              className={
                useScrollableTabs
                  ? 'min-h-11 min-w-[5.5rem] shrink-0 truncate rounded-lg px-2 py-2 text-xs font-medium transition-all sm:min-w-[6.5rem] sm:px-3 sm:text-sm data-[state=active]:bg-background/75 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm'
                  : 'min-h-11 min-w-0 truncate rounded-lg px-2 py-2 text-xs font-medium transition-all sm:px-3 sm:text-sm data-[state=active]:bg-background/75 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:backdrop-blur-sm'
              }
            >
              {spec.labelFa}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className={cn('min-w-0', PROFILE_TABS_TO_CONTENT)}>
        {tabSpecs.map((tab) => {
          const sectionIds = getSectionsForTab(tab.id, business, layout);
          const hasContent = tabHasContent(tab.id, business, layout);

          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-[34px] focus-visible:outline-hidden">
              {!hasContent && EMPTY_MESSAGES[tab.id] && (
                <ProfileTabEmpty message={EMPTY_MESSAGES[tab.id]!} />
              )}
              {sectionIds.map((id) => (
                <div key={id}>{renderProfileSection(id, sectionProps)}</div>
              ))}
            </TabsContent>
          );
        })}
      </div>
    </Tabs>
  );
}
