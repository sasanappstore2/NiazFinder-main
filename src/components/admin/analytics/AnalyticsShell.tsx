'use client';

import { AdminPageShell } from '@/components/admin/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsFilterBar } from '@/components/admin/analytics/AnalyticsFilterBar';
import { useAnalyticsHub } from '@/components/admin/analytics/useAnalyticsHub';
import { ExecutiveTab } from '@/components/admin/analytics/tabs/ExecutiveTab';
import { RealtimeTab } from '@/components/admin/analytics/tabs/RealtimeTab';
import { AcquisitionTab } from '@/components/admin/analytics/tabs/AcquisitionTab';
import { EngagementTab } from '@/components/admin/analytics/tabs/EngagementTab';
import { GeoTab } from '@/components/admin/analytics/tabs/GeoTab';
import { TechnologyTab } from '@/components/admin/analytics/tabs/TechnologyTab';
import { BusinessTab } from '@/components/admin/analytics/tabs/BusinessTab';
import { ConversionsTab } from '@/components/admin/analytics/tabs/ConversionsTab';
import { FunnelsTab } from '@/components/admin/analytics/tabs/FunnelsTab';
import { RetentionTab } from '@/components/admin/analytics/tabs/RetentionTab';
import { PlatformTab } from '@/components/admin/analytics/tabs/PlatformTab';
import type { AnalyticsTabId } from '@/components/admin/modules/shared/types';
import { cn } from '@/lib/utils';

const TABS: Array<{ id: AnalyticsTabId; label: string; live?: boolean }> = [
  { id: 'executive', label: 'خلاصه' },
  { id: 'realtime', label: 'آنی', live: true },
  { id: 'acquisition', label: 'اکتساب' },
  { id: 'engagement', label: 'تعامل' },
  { id: 'geo', label: 'جغرافیا' },
  { id: 'technology', label: 'فناوری' },
  { id: 'business', label: 'کسب‌وکار' },
  { id: 'conversions', label: 'رویدادها' },
  { id: 'funnels', label: 'قیف' },
  { id: 'retention', label: 'نگهداری' },
  { id: 'platform', label: 'پلتفرم' },
];

export function AnalyticsShell() {
  const hub = useAnalyticsHub();

  return (
    <AdminPageShell
      section="analytics"
      layout="dashboard"
      description="Analytics Hub Pro — ترافیک first-party، قیف‌ها، نگهداشت و KPI عملیاتی"
    >
      <AnalyticsFilterBar
        filters={hub.filters}
        onChange={(p) => hub.setFilters(p)}
        onRefresh={() => void hub.refreshTab(hub.activeTab)}
        lastUpdated={hub.lastUpdated}
      />

      <Tabs value={hub.activeTab} onValueChange={(v) => hub.setActiveTab(v as AnalyticsTabId)}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              {t.label}
              {t.live && hub.activeTab === 'realtime' && (
                <span className={cn('inline-block size-2 rounded-full bg-emerald-500 animate-pulse')} />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveTab hub={hub} />
        </TabsContent>
        <TabsContent value="realtime">
          <RealtimeTab hub={hub} />
        </TabsContent>
        <TabsContent value="acquisition">
          <AcquisitionTab hub={hub} />
        </TabsContent>
        <TabsContent value="engagement">
          <EngagementTab hub={hub} />
        </TabsContent>
        <TabsContent value="geo">
          <GeoTab hub={hub} />
        </TabsContent>
        <TabsContent value="technology">
          <TechnologyTab hub={hub} />
        </TabsContent>
        <TabsContent value="business">
          <BusinessTab hub={hub} />
        </TabsContent>
        <TabsContent value="conversions">
          <ConversionsTab hub={hub} />
        </TabsContent>
        <TabsContent value="funnels">
          <FunnelsTab hub={hub} />
        </TabsContent>
        <TabsContent value="retention">
          <RetentionTab hub={hub} />
        </TabsContent>
        <TabsContent value="platform">
          <PlatformTab hub={hub} />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
