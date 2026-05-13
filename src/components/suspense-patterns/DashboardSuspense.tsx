'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSidebarSkeleton } from '@/components/skeletons';

// ============ Sub-skeletons for dashboard sections ============

function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-2 p-4 sm:p-6">
      <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
      <div className="h-4 w-64 rounded bg-muted animate-pulse" />
    </div>
  );
}

function DashboardStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 p-4 sm:px-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="size-9 rounded-lg bg-primary/10" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <div className="flex items-end gap-1 h-8">
            {[40, 60, 35, 80, 55, 70, 45].map((h, j) => (
              <Skeleton
                key={j}
                className="flex-1 rounded-t bg-primary/10"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentRequestsTableSkeleton() {
  return (
    <div className="lg:col-span-2 glass-card rounded-xl p-5 space-y-4 mx-4 sm:mx-6 lg:mx-0">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-lg bg-primary/10" />
      </div>
      <div className="hidden sm:flex items-center gap-4 pb-3 border-b border-border">
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-3.5 w-16 rounded" />
        <Skeleton className="h-3.5 w-16 rounded ms-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-lg"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="hidden sm:block h-5 w-14 rounded-full bg-primary/5" />
            <Skeleton className="hidden sm:block h-5 w-16 rounded-full" />
            <Skeleton className="hidden sm:block h-4 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsChartSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4 mx-4 sm:mx-6 lg:mx-0">
      <Skeleton className="h-5 w-28 rounded-md" />
      <Skeleton className="h-8 w-32 rounded" />
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Skeleton
              className="w-full rounded-t bg-primary/15"
              style={{ height: `${30 + (i * 7) % 50}%` }}
            />
            <Skeleton className="h-3 w-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-3 mx-4 sm:mx-6 lg:mx-0">
      <Skeleton className="h-5 w-28 rounded-md" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30"
          >
            <Skeleton className="size-8 rounded-lg bg-primary/10" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Placeholder components ============

function DashboardSidebarPlaceholder() { return null; }
function DashboardHeaderPlaceholder() { return null; }
function DashboardStatsPlaceholder() { return null; }
function RecentRequestsPlaceholder() { return null; }
function EarningsChartPlaceholder() { return null; }
function QuickActionsPlaceholder() { return null; }

// ============ Main Suspense-wrapped Dashboard ============

/**
 * Dashboard with per-section Suspense boundaries.
 * Replace Placeholder components with actual async server components.
 */
export default function DashboardSuspense() {
  return (
    <div className="flex h-full">
      {/* Sidebar (separate Suspense boundary) */}
      <Suspense fallback={<DashboardSidebarSkeleton />}>
        <DashboardSidebarPlaceholder />
      </Suspense>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <Suspense fallback={<DashboardHeaderSkeleton />}>
          <DashboardHeaderPlaceholder />
        </Suspense>

        {/* Stats cards */}
        <Suspense fallback={<DashboardStatsCardsSkeleton />}>
          <DashboardStatsPlaceholder />
        </Suspense>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pb-6">
          {/* Recent requests */}
          <Suspense fallback={<RecentRequestsTableSkeleton />}>
            <RecentRequestsPlaceholder />
          </Suspense>

          {/* Right column */}
          <div className="space-y-6">
            {/* Earnings chart */}
            <Suspense fallback={<EarningsChartSkeleton />}>
              <EarningsChartPlaceholder />
            </Suspense>

            {/* Quick actions */}
            <Suspense fallback={<QuickActionsSkeleton />}>
              <QuickActionsPlaceholder />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Full page skeleton for dashboard loading.
 */
export function DashboardFullSkeleton() {
  return (
    <div className="flex h-full">
      <DashboardSidebarSkeleton />
      <div className="flex-1 overflow-y-auto">
        <DashboardHeaderSkeleton />
        <DashboardStatsCardsSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pb-6">
          <RecentRequestsTableSkeleton />
          <div className="space-y-6">
            <EarningsChartSkeleton />
            <QuickActionsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
