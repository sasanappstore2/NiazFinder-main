'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toPersianDigits } from '@/lib/format/digits';

type AnalyticsRes = {
  totals: { views: number; clicks: number; conversions: number; saves: number };
  series: { date: string; views: number }[];
};

export function BusinessAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsRes | null>(null);

  useEffect(() => {
    apiFetch<AnalyticsRes>('/api/business/me/analytics?days=30')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const totals = data?.totals;

  return (
    <Card>
      <CardHeader>
        <CardTitle>آمار ۳۰ روز اخیر</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['بازدید', totals?.views ?? 0],
            ['کلیک', totals?.clicks ?? 0],
            ['تبدیل', totals?.conversions ?? 0],
            ['ذخیره', totals?.saves ?? 0],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{toPersianDigits(String(value))}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
