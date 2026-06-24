'use client';

import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBusinessCategoryTitle } from '@/lib/business/business-category';
import { getIncompleteItemIdsForTask } from '@/lib/business/real-estate-hub-completion';
import { getRealEstateHubTasks, REAL_ESTATE_TASK_LABELS } from '@/lib/business/real-estate-hub-tasks';
import { useBusinessHub } from '../BusinessHubContext';
import { RealEstateHubProvider, useRealEstateHub } from './RealEstateHubProvider';
import { RealEstateHubHeader } from './RealEstateHubHeader';
import { RealEstateHubProgress } from './RealEstateHubProgress';
import { RealEstateHubTaskGrid } from './RealEstateHubTaskGrid';
import { RealEstateHubMobileNav } from './RealEstateHubMobileNav';
import { RealEstateOverviewPanel } from './panels/RealEstateOverviewPanel';
import { RealEstateListingsPanel } from './panels/RealEstateListingsPanel';
import { RealEstatePortfolioPanel } from './panels/RealEstatePortfolioPanel';
import { RealEstateServicesPanel } from './panels/RealEstateServicesPanel';
import { RealEstateCoveragePanel } from './panels/RealEstateCoveragePanel';
import { RealEstateWidgetsPanel } from './panels/RealEstateWidgetsPanel';
import { RealEstateDocumentsPanel } from './panels/RealEstateDocumentsPanel';
import { BusinessProfilePanel } from '../panels/BusinessProfilePanel';
import { BusinessBrandPanel } from '../panels/BusinessBrandPanel';
import { BusinessContactsPanel } from '../panels/BusinessContactsPanel';
import { BusinessHubAdvanced } from '../BusinessHubAdvanced';
import { RE_HUB_ICON } from './real-estate-hub-tokens';

function RealEstateHubBody({
  onProfileSaved,
}: {
  onProfileSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { profile } = useBusinessHub();
  const {
    subtype,
    activeTask,
    completion,
    highlightedItemIds,
    panelRef,
    reLoading,
    reRefreshing,
  } = useRealEstateHub();

  if (!profile || !subtype) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری پنل املاک...
      </div>
    );
  }

  const tasks = getRealEstateHubTasks(subtype);
  const panelTitle = REAL_ESTATE_TASK_LABELS[activeTask];
  const occupationLabel = getBusinessCategoryTitle(subtype);
  const incompleteLabels =
    completion?.items
      .filter((item) => !item.completed && item.taskId === activeTask)
      .map((item) => item.label) ?? [];
  const showIncompleteCallout =
    activeTask !== 'overview' &&
    highlightedItemIds.length > 0 &&
    getIncompleteItemIdsForTask(completion, activeTask).length > 0;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <RealEstateHubHeader occupationLabel={occupationLabel} />
      <RealEstateHubProgress completion={completion} />
      <RealEstateHubTaskGrid tasks={tasks} completion={completion} />

      <div
        ref={panelRef}
        className="relative min-w-0 scroll-mt-4 rounded-xl border border-border/60 bg-card p-4 sm:p-6"
      >
        {(reLoading || reRefreshing) && (
          <div className="absolute inset-x-0 top-0 flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {activeTask !== 'overview' && (
          <div className="mb-4 flex items-center gap-2">
            <Building2 className={cn('size-4', RE_HUB_ICON)} />
            <h2 className="text-base font-semibold">{panelTitle}</h2>
          </div>
        )}

        {showIncompleteCallout && (
          <div className="mb-4 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs text-foreground">
            <span className="font-medium">برای تکمیل این بخش:</span>{' '}
            {incompleteLabels.join(' · ')}
          </div>
        )}

        <div className={reRefreshing ? 'pointer-events-none opacity-60' : undefined}>
          {activeTask === 'overview' && (
            <RealEstateOverviewPanel completion={completion} occupationLabel={occupationLabel} />
          )}
          {activeTask === 'profile' && <BusinessProfilePanel onSaved={onProfileSaved} />}
          {activeTask === 'brand' && <BusinessBrandPanel />}
          {activeTask === 'listings' && <RealEstateListingsPanel />}
          {activeTask === 'portfolio' && <RealEstatePortfolioPanel />}
          {activeTask === 'services' && <RealEstateServicesPanel />}
          {activeTask === 'coverage' && <RealEstateCoveragePanel />}
          {activeTask === 'widgets' && <RealEstateWidgetsPanel />}
          {activeTask === 'documents' && <RealEstateDocumentsPanel />}
          {activeTask === 'contacts' && <BusinessContactsPanel />}
        </div>
      </div>

      <BusinessHubAdvanced onSlugSaved={onProfileSaved} />
      <RealEstateHubMobileNav tasks={tasks} />
    </div>
  );
}

export function RealEstateHubLayout({
  onProfileSaved,
}: {
  onProfileSaved?: (data: { slug: string; name: string }) => void;
}) {
  return (
    <RealEstateHubProvider>
      <RealEstateHubBody onProfileSaved={onProfileSaved} />
    </RealEstateHubProvider>
  );
}
