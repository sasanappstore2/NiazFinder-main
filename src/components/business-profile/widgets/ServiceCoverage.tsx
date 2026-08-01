'use client';

import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import { getServiceAreaState, summarizeCoverage } from '@/lib/business/ecosystem';

export default function ServiceCoverage({ business }: { business: Business }) {
  const summary = useMemo(
    () => summarizeCoverage(getServiceAreaState(business).areas),
    [business]
  );

  if (summary.totalAreas === 0) {
    return <p className="text-sm text-muted-foreground">محدوده خدماتی ثبت نشده است.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        {summary.cities.map((c) => (
          <div key={c.city} className="flex items-center justify-between rounded-lg border p-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 text-primary" />
              {c.city}
            </span>
            <span className="text-xs text-muted-foreground">
              {c.areaCount.toLocaleString('fa-IR')} منطقه · قدرت {c.strength.toLocaleString('fa-IR')}
            </span>
          </div>
        ))}
      </div>

      {summary.topNeighborhoods.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">محله‌های برتر</h4>
          <div className="flex flex-wrap gap-2">
            {summary.topNeighborhoods.map((n) => (
              <span
                key={n.label}
                className="rounded-full border px-2 py-0.5 text-xs"
                style={{ opacity: 0.5 + (n.strength / 5) * 0.5 }}
              >
                {n.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
