'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCardSkeleton } from './CategoryCardSkeleton';
import { RequestCardSkeleton } from './RequestCardSkeleton';
import { SpecialistCardSkeleton } from './SpecialistCardSkeleton';

interface HomePageSkeletonProps {
  className?: string;
}

export function HomePageSkeleton({ className }: HomePageSkeletonProps) {
  return (
    <div className={className ?? ''}>
      {/* ===== Hero Section Skeleton ===== */}
      <section className="relative hero-gradient pattern-overlay overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-36">
          <div className="flex flex-col items-center text-center gap-6">
            {/* Badge */}
            <Skeleton className="h-7 w-40 rounded-full bg-primary/10" />
            {/* Title */}
            <Skeleton className="h-10 sm:h-12 w-72 sm:w-96 rounded-lg" />
            {/* Subtitle */}
            <Skeleton className="h-5 sm:h-6 w-80 sm:w-md rounded" />
            {/* Search bar */}
            <Skeleton className="h-12 sm:h-14 w-full max-w-xl rounded-2xl" />
            {/* CTA buttons */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-36 rounded-xl bg-primary/15" />
              <Skeleton className="h-11 w-40 rounded-xl" />
            </div>
            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Skeleton className="size-4 rounded bg-primary/10" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute top-20 inset-s-10 size-40 rounded-full bg-primary/5 animate-morph-blob-1" />
        <div className="absolute bottom-10 inset-e-10 size-56 rounded-full bg-primary/5 animate-morph-blob-2" />
      </section>

      {/* ===== Stats Counter Skeleton (4 animated counters) ===== */}
      <section className="py-12 border-y border-border/50 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Categories Grid Skeleton (8 category cards) ===== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Section header */}
          <div className="text-center space-y-3">
            <Skeleton className="h-7 w-48 rounded-md mx-auto" />
            <Skeleton className="h-4 w-72 rounded mx-auto" />
          </div>
          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it Works Skeleton (3 step cards) ===== */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section header */}
          <div className="text-center space-y-3">
            <Skeleton className="h-7 w-48 rounded-md mx-auto" />
            <Skeleton className="h-4 w-72 rounded mx-auto" />
          </div>
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-6 space-y-4 text-center relative"
              >
                {/* Step number */}
                <Skeleton className="size-12 rounded-full bg-primary/10 mx-auto" />
                {/* Title */}
                <Skeleton className="h-5 w-28 rounded-md mx-auto" />
                {/* Description */}
                <div className="space-y-2 max-w-xs mx-auto">
                  <Skeleton className="h-3.5 w-full rounded" />
                  <Skeleton className="h-3.5 w-4/5 rounded mx-auto" />
                </div>
                {/* Connector arrow (hidden on last) */}
                {i < 2 && (
                  <Skeleton className="hidden md:block absolute -inset-s-3 top-1/2 -translate-y-1/2 size-6 rotate-180 bg-primary/5 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Featured Requests Skeleton (3 request cards) ===== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg bg-primary/10" />
          </div>
          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Top Specialists Skeleton (3 specialist cards) ===== */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg bg-primary/10" />
          </div>
          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SpecialistCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Section Skeleton ===== */}
      <section className="py-20 sm:py-28 relative overflow-hidden hero-gradient pattern-overlay">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Skeleton className="h-8 w-72 rounded-lg mx-auto" />
          <Skeleton className="h-5 w-96 rounded mx-auto max-w-full" />
          <div className="flex items-center justify-center gap-3 pt-2">
            <Skeleton className="h-12 w-44 rounded-xl bg-primary/15" />
            <Skeleton className="h-12 w-44 rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
