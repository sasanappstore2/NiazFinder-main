'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessHubHeader } from './BusinessHubHeader';
import { BusinessHubProgress } from './BusinessHubProgress';
import { BusinessHubTaskGrid } from './BusinessHubTaskGrid';
import { BusinessHubMobileNav } from './BusinessHubMobileNav';
import { BusinessHubAdvanced } from './BusinessHubAdvanced';
import { BusinessHubInitializer } from './BusinessHubInitializer';
import { useBusinessHub } from './BusinessHubContext';
import { BusinessProfilePanel } from './panels/BusinessProfilePanel';
import { BusinessBrandPanel } from './panels/BusinessBrandPanel';
import { BusinessStorefrontPanel } from './panels/BusinessStorefrontPanel';
import { BusinessGalleryPanel } from './panels/BusinessGalleryPanel';
import { BusinessContactsPanel } from './panels/BusinessContactsPanel';

import { BusinessFilingsPanel } from './panels/BusinessFilingsPanel';
import { HUB_TASK_LABELS } from './hub-tasks';

const PANELS_WITHOUT_HEADING = new Set(['storefront', 'filings']);

function BusinessHubBody({
  onProfileSaved,
}: {
  onProfileSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { activeTask, refreshing } = useBusinessHub();

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <BusinessHubHeader />
      <BusinessHubProgress />
      <BusinessHubTaskGrid />

      <div className="relative min-w-0 rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        {refreshing && (
          <div className="absolute inset-x-0 top-0 flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {activeTask !== 'storefront' && !PANELS_WITHOUT_HEADING.has(activeTask) && (
          <h2 className="mb-4 text-base font-semibold">{HUB_TASK_LABELS[activeTask]}</h2>
        )}

        <div
          className={cn(
            refreshing && 'opacity-60 pointer-events-none',
            activeTask === 'storefront' && 'pt-0'
          )}
        >
          {activeTask === 'storefront' && <BusinessStorefrontPanel />}
          {activeTask === 'profile' && <BusinessProfilePanel onSaved={onProfileSaved} />}
          {activeTask === 'brand' && <BusinessBrandPanel />}
          {activeTask === 'gallery' && <BusinessGalleryPanel />}
          {activeTask === 'contacts' && <BusinessContactsPanel />}
          {activeTask === 'filings' && <BusinessFilingsPanel />}
        </div>
      </div>

      <BusinessHubAdvanced onSlugSaved={onProfileSaved} />
      <BusinessHubMobileNav />
    </div>
  );
}

export function BusinessHubLayout({
  onProfileSaved,
}: {
  onProfileSaved?: (data: { slug: string; name: string }) => void;
}) {
  return (
    <BusinessHubInitializer>
      <BusinessHubBody onProfileSaved={onProfileSaved} />
    </BusinessHubInitializer>
  );
}
