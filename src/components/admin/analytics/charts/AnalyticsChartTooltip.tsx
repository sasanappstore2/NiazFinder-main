'use client';

import type { TooltipProps } from 'recharts';

export function AnalyticsChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-(--color-mainBorder) bg-(--color-primaryBg) px-3 py-2 text-xs shadow">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString('fa-IR')}
        </p>
      ))}
    </div>
  );
}
