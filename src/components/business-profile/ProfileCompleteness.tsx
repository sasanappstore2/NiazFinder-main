'use client';

import React from 'react';
import { CircleCheck, CircleAlert } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import { useAppStore } from '@/lib/store';
import { computeProfileCompleteness } from '@/lib/business/profile-completeness';

/**
 * Profile completeness meter — owner-only.
 *
 * Rendered above the profile content but only for the profile owner (compares
 * the logged-in user id to `business.userId`), so public visitors never see a
 * half-empty bar. Returns null when there is nothing to nag about.
 */
export function ProfileCompleteness({ business }: { business: Business }) {
  const currentUser = useAppStore((s) => s.currentUser);

  const isOwner = Boolean(currentUser && currentUser.id === business.userId);
  if (!isOwner) return null;

  const { score, missing } = computeProfileCompleteness(business);
  if (missing.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CircleAlert className="size-5 text-amber-500" />
          <h3 className="text-sm font-semibold">تکمیل پروفایل</h3>
        </div>
        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
          {score.toLocaleString('fa-IR')}٪
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="mt-3">
        <p className="mb-2 text-xs text-muted-foreground">موارد باقی‌مانده:</p>
        <div className="flex flex-wrap gap-2">
          {missing.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              <CircleCheck className="size-3.5 text-muted-foreground" />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
