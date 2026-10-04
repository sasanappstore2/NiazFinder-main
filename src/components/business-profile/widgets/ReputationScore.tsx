'use client';

import React, { useMemo } from 'react';
import type { Business } from '@/contracts/business-profile';
import {
  REPUTATION_LEVEL_LABELS,
  computeReputation,
} from '@/lib/business/ecosystem';

const LEVEL_COLOR: Record<string, string> = {
  bronze: '#b45309',
  silver: '#64748b',
  gold: '#d97706',
  platinum: '#7c3aed',
};

export default function ReputationScore({ business }: { business: Business }) {
  const result = useMemo(() => computeReputation(business), [business]);
  const color = LEVEL_COLOR[result.level];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 font-bold"
          style={{ borderColor: color, color }}
        >
          <span className="text-2xl">{result.score.toLocaleString('fa-IR')}</span>
          <span className="text-[10px]">از ۱۰۰</span>
        </div>
        <div>
          <div
            className="inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {REPUTATION_LEVEL_LABELS[result.level]}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            امتیاز اعتبار بر اساس کامل بودن پروفایل، تطابق‌ها، نظرات و فعالیت
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {result.breakdown.map((b) => (
          <div key={b.key} className="rounded-lg border p-2 text-center">
            <div className="text-xs text-muted-foreground">{b.label}</div>
            <div className="text-sm font-semibold">
              {b.value.toLocaleString('fa-IR')}
              <span className="text-muted-foreground">/{b.max.toLocaleString('fa-IR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
