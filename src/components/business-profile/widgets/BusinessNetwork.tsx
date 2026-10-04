'use client';

import React, { useMemo } from 'react';
import { Network } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import {
  RELATION_LABELS,
  computeReferralStats,
  getNetworkState,
} from '@/lib/business/ecosystem';

export default function BusinessNetwork({ business }: { business: Business }) {
  const state = useMemo(() => getNetworkState(business), [business]);
  const stats = useMemo(() => computeReferralStats(state.referralsSent), [state]);

  if (state.connections.length === 0 && stats.total === 0) {
    return <p className="text-sm text-muted-foreground">هنوز ارتباطی در شبکه ثبت نشده است.</p>;
  }

  return (
    <div className="space-y-4">
      {state.connections.length > 0 && (
        <div className="space-y-2">
          {state.connections.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-2">
              <span className="flex items-center gap-2 text-sm">
                <Network className="size-4 text-primary" />
                {c.note || c.targetBusinessId}
              </span>
              <span className="text-xs text-muted-foreground">{RELATION_LABELS[c.type]}</span>
            </div>
          ))}
        </div>
      )}

      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="ارجاع‌ها" value={stats.total} />
          <Stat label="پذیرفته‌شده" value={stats.accepted} />
          <Stat label="نرخ تبدیل" value={`${stats.conversionRate}%`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-lg font-bold">
        {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
