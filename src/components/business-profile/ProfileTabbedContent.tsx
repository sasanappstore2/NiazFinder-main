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
  const gridCols = tabSpecs.length <= 3 ? 'grid-cols-3' : 'grid-cols-4';
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
        className={`profile-primary-tabs sticky top-(--site-header-offset,6.5rem) z-[calc(var(--z-header)-1)] grid h-auto w-full ${gridCols} gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 shadow-sm backdrop-blur-sm`}
      >
        {displayOrder.map((tabId) => {
          const spec = tabSpecs.find((t) => t.id === tabId);
          if (!spec) return null;
          return (
            <TabsTrigger
              key={tabId}
              value={tabId}
              className="rounded-lg py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              {spec.labelFa}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="min-w-0 pt-6">
        {tabSpecs.map((tab) => {
          const sectionIds = getSectionsForTab(tab.id, business, layout);
          const hasContent = tabHasContent(tab.id, business, layout);

          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-8 focus-visible:outline-hidden">
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
