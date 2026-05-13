'use client';

import React, { Suspense, type ReactNode } from 'react';

interface StreamBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

const defaultFallback = (
  <div className="flex items-center justify-center p-8 space-y-3">
    <div className="flex items-center gap-2">
      <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">در حال بارگذاری...</span>
    </div>
  </div>
);

/**
 * Reusable Suspense wrapper with development timing logs.
 * Use for wrapping async server components that stream.
 */
export function StreamBoundary({
  children,
  fallback,
  name = 'unnamed',
}: StreamBoundaryProps) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    return (
      <Suspense
        fallback={
          fallback ?? (
            <StreamBoundaryFallback name={name} startTime={startTime} />
          )
        }
      >
        <StreamTimingLogger name={name} startTime={startTime}>
          {children}
        </StreamTimingLogger>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback ?? defaultFallback}>
      {children}
    </Suspense>
  );
}

/** Default fallback with spinner and label */
function StreamBoundaryFallback({
  name,
  startTime,
}: {
  name: string;
  startTime: number;
}) {
  return (
    <div className="flex items-center justify-center p-8 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">
          در حال بارگذاری {name}...
        </span>
      </div>
    </div>
  );
}

/** Logs timing when content resolves (dev only) */
function StreamTimingLogger({
  name,
  startTime,
  children,
}: {
  name: string;
  startTime: number;
  children: ReactNode;
}) {
  // We'll use a useEffect to log when the content appears
  return <TimingWrapper name={name} startTime={startTime}>{children}</TimingWrapper>;
}

function TimingWrapper({
  name,
  startTime,
  children,
}: {
  name: string;
  startTime: number;
  children: ReactNode;
}) {
  React.useEffect(() => {
    const elapsed = performance.now() - startTime;
    console.log(
      `%c[Stream] "${name}" resolved in ${elapsed.toFixed(1)}ms`,
      'color: #10b981; font-weight: bold;'
    );
  }, [name, startTime]);

  return <>{children}</>;
}
