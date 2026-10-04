'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import {
  VERIFICATION_BADGE_COLOR,
  VERIFICATION_LABELS,
  getVerificationState,
} from '@/lib/business/ecosystem';

export default function VerificationBadges({ business }: { business: Business }) {
  const state = getVerificationState(business);
  const color = VERIFICATION_BADGE_COLOR[state.level];
  const approvedDocs = state.documents.filter((d) => d.status === 'approved');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5" style={{ color }} />
        <span className="rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
          سطح احراز: {VERIFICATION_LABELS[state.level]}
        </span>
      </div>

      {state.manualBadges && state.manualBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {state.manualBadges.map((b) => (
            <span key={b} className="rounded-full border px-2 py-0.5 text-xs">{b}</span>
          ))}
        </div>
      )}

      {approvedDocs.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {approvedDocs.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              {d.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">مدرک تأییدشده‌ای ثبت نشده است.</p>
      )}
    </div>
  );
}
