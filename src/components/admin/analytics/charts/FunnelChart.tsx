'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import type { TrafficAnalyticsFunnelStep } from '@/components/admin/modules/shared/types';

const STEP_LABELS: Record<string, string> = {
  page_view: 'بازدید صفحه',
  signup_completed: 'ثبت‌نام',
  need_created: 'ثبت نیاز',
  chat_started: 'شروع گفتگو',
  proposal_sent: 'ارسال پیشنهاد',
  business_profile_view: 'مشاهده پروفایل',
};

export function FunnelChart({
  steps,
  totalSessions,
}: {
  steps: TrafficAnalyticsFunnelStep[];
  totalSessions?: number;
}) {
  const chartData = steps.map((s) => ({
    name: STEP_LABELS[s.name] ?? s.name,
    count: s.count,
    rate: s.rate,
    fill: `hsl(${220 - s.stepIndex * 25}, 70%, 55%)`,
  }));

  return (
    <div>
      {totalSessions != null && (
        <p className="mb-2 text-sm text-(--color-secondaryText)">
          {totalSessions.toLocaleString('fa-IR')} نشست در بازه
        </p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip content={<AnalyticsChartTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} name="نشست">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
