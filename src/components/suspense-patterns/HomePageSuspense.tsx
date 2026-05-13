'use client';

import React, { Suspense } from 'react';
import {
  HomePageSkeleton,
} from '@/components/skeletons';
import { RequestCardSkeleton } from '@/components/skeletons';
import { SpecialistCardSkeleton } from '@/components/skeletons';
import { CategoryCardSkeleton } from '@/components/skeletons';

// ============ Sub-skeletons for individual sections ============

function HeroSectionSkeleton() {
  return (
    <section className="relative hero-gradient pattern-overlay overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-36">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="h-7 w-40 rounded-full bg-primary/10 animate-pulse" />
          <div className="h-10 sm:h-12 w-72 sm:w-96 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 sm:h-6 w-80 sm:w-[28rem] rounded bg-muted animate-pulse" />
          <div className="h-12 sm:h-14 w-full max-w-xl rounded-2xl bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-11 w-36 rounded-xl bg-primary/15 animate-pulse" />
            <div className="h-11 w-40 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSectionSkeleton() {
  return (
    <section className="py-12 border-y border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesSectionSkeleton() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSectionSkeleton() {
  return (
    <section className="py-16 sm:py-20 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 space-y-4 text-center">
              <div className="size-12 rounded-full bg-primary/10 animate-pulse mx-auto" />
              <div className="h-5 w-28 rounded-md bg-muted animate-pulse mx-auto" />
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedRequestsSectionSkeleton() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-primary/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TopSpecialistsSectionSkeleton() {
  return (
    <section className="py-16 sm:py-20 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-primary/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SpecialistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASectionSkeleton() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden hero-gradient pattern-overlay">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="h-8 w-72 rounded-lg bg-muted animate-pulse mx-auto" />
        <div className="h-5 w-96 rounded bg-muted animate-pulse mx-auto max-w-full" />
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="h-12 w-44 rounded-xl bg-primary/15 animate-pulse" />
          <div className="h-12 w-44 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// ============ Placeholder components (to be replaced with real ones) ============

/** Placeholder for HeroSection - replace with actual component */
function HeroSectionPlaceholder() {
  return null;
}

/** Placeholder for StatsCounter - replace with actual component */
function StatsCounterPlaceholder() {
  return null;
}

/** Placeholder for CategoriesSection - replace with actual component */
function CategoriesSectionPlaceholder() {
  return null;
}

/** Placeholder for HowItWorksSection - replace with actual component */
function HowItWorksSectionPlaceholder() {
  return null;
}

/** Placeholder for FeaturedRequests - replace with actual component */
function FeaturedRequestsPlaceholder() {
  return null;
}

/** Placeholder for TopSpecialists - replace with actual component */
function TopSpecialistsPlaceholder() {
  return null;
}

/** Placeholder for CTASection - replace with actual component */
function CTASectionPlaceholder() {
  return null;
}

// ============ Main Suspense-wrapped Homepage ============

/**
 * Suspense-wrapped homepage with per-section streaming boundaries.
 * Replace Placeholder components with actual async server components.
 */
export default function HomePageSuspense() {
  return (
    <>
      {/* Hero - streams first (above fold) */}
      <Suspense fallback={<HeroSectionSkeleton />}>
        <HeroSectionPlaceholder />
      </Suspense>

      {/* Stats counter */}
      <Suspense fallback={<StatsSectionSkeleton />}>
        <StatsCounterPlaceholder />
      </Suspense>

      {/* Categories */}
      <Suspense fallback={<CategoriesSectionSkeleton />}>
        <CategoriesSectionPlaceholder />
      </Suspense>

      {/* How it works */}
      <Suspense fallback={<HowItWorksSectionSkeleton />}>
        <HowItWorksSectionPlaceholder />
      </Suspense>

      {/* Featured requests */}
      <Suspense fallback={<FeaturedRequestsSectionSkeleton />}>
        <FeaturedRequestsPlaceholder />
      </Suspense>

      {/* Top specialists */}
      <Suspense fallback={<TopSpecialistsSectionSkeleton />}>
        <TopSpecialistsPlaceholder />
      </Suspense>

      {/* CTA */}
      <Suspense fallback={<CTASectionSkeleton />}>
        <CTASectionPlaceholder />
      </Suspense>
    </>
  );
}

/**
 * Fallback that renders the full homepage skeleton.
 * Useful when the entire page is loading.
 */
export function HomePageFullSkeleton() {
  return <HomePageSkeleton />;
}
