'use client';

import React, { Component, Suspense, useMemo, type ReactNode } from 'react';
import type { Business } from '@/contracts/business-profile';
import {
  getPrimaryRealEstateSubtype,
  getWidgetConfigForBusiness,
} from '@/lib/business/widget-config';
import { WIDGET_REGISTRY, type WidgetDefinition } from '@/lib/business/widget-registry';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  business: Business;
  requestId?: string;
}

/**
 * H3 — Per-widget error boundary. A single widget that throws (render error or a
 * rejected lazy import) is isolated and rendered as `null`, so it can never crash
 * the whole profile page.
 */
class WidgetErrorBoundary extends Component<
  { widgetId: string; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { widgetId: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Non-fatal: log for diagnostics, keep the rest of the profile intact.
    console.error(`Widget "${this.props.widgetId}" failed to render:`, error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Renders enabled widgets for the business's primary real-estate subtype.
 * Respects per-profile overrides stored in extensions.widgets.
 */
export function DynamicWidgetRenderer({ business, requestId }: Props) {
  const subtype = useMemo(() => getPrimaryRealEstateSubtype(business), [business]);

  const widgets = useMemo(() => {
    if (!subtype) return [];
    const config = getWidgetConfigForBusiness(business, subtype);
    const defs = WIDGET_REGISTRY[subtype] ?? [];
    return config
      .filter((c) => c.enabled)
      .map((c) => defs.find((d) => d.id === c.id))
      .filter(Boolean) as WidgetDefinition[];
  }, [business, subtype]);

  if (!subtype || widgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {widgets.map((widget) => {
        const WidgetComponent = widget.component;
        return (
          <WidgetErrorBoundary key={widget.id} widgetId={widget.id}>
            <Suspense
              fallback={
                <div className="rounded-2xl border p-6">
                  <Skeleton className="h-8 w-1/3 mb-4" />
                  <Skeleton className="h-48 w-full" />
                </div>
              }
            >
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold">{widget.title}</h3>
                <WidgetComponent business={business} requestId={requestId} />
              </div>
            </Suspense>
          </WidgetErrorBoundary>
        );
      })}
    </div>
  );
}
