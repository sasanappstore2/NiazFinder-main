'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminChartCard } from '@/components/admin/ui';
import { FunnelChart } from '@/components/admin/analytics/charts/FunnelChart';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsFunnel } from '@/components/admin/modules/shared/types';

type FunnelsData = {
  need: TrafficAnalyticsFunnel;
  business: TrafficAnalyticsFunnel;
  chat: TrafficAnalyticsFunnel;
  intakeWizard?: TrafficAnalyticsFunnel;
};

const FUNNEL_TABS = [
  ['need', 'نیاز'],
  ['intakeWizard', '/post'],
  ['business', 'کسب‌وکار'],
  ['chat', 'گفتگو'],
] as const;

export function FunnelsTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<FunnelsData>('funnels');

  if (hub.isTabLoading('funnels') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <Tabs defaultValue="need">
      <TabsList>
        {FUNNEL_TABS.map(([id, label]) => (
          <TabsTrigger key={id} value={id}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {FUNNEL_TABS.map(([id, label]) => {
        const funnel = data[id];
        if (!funnel?.steps) {
          return (
            <TabsContent key={id} value={id} className="mt-4">
              <AnalyticsEmptyState />
            </TabsContent>
          );
        }
        return (
          <TabsContent key={id} value={id} className="mt-4">
            <AdminChartCard title={`قیف ${label}`}>
              <FunnelChart steps={funnel.steps} totalSessions={funnel.totalSessions} />
            </AdminChartCard>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
