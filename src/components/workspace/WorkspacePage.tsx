'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import { enrichFollowUpsFromSources } from '@/lib/business/workspace/enrich-follow-ups';
import type { WorkspaceFollowUpCandidate } from '@/lib/business/workspace/follow-up-source';
import { useAppStore } from '@/lib/store';
import { AddToFollowUpDialog } from './AddToFollowUpDialog';
import { CreateCollaborationDialog } from './CreateCollaborationDialog';
import { useWorkspaceData } from './hooks/useWorkspaceData';
import { useWorkspacePolling } from './hooks/useWorkspacePolling';
import { useWorkspaceFollowUps } from './hooks/useWorkspaceFollowUps';
import { useFollowUpReminderScheduler } from './hooks/useFollowUpReminderScheduler';
import { useWorkspaceSearch } from './hooks/useWorkspaceSearch';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSearch } from './WorkspaceSearch';
import { WorkspaceQuickAdd } from './WorkspaceQuickAdd';
import { KanbanBoard } from './kanban/KanbanBoard';
import type { WorkspaceColumnId } from './types';

export function WorkspacePage({
  adminPreview = false,
  headerActions,
}: {
  adminPreview?: boolean;
  headerActions?: ReactNode;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const authHydrated = useAppStore((s) => s.authHydrated);
  const unreadNotificationCount = useAppStore((s) => s.unreadNotificationCount);
  const userId = currentUser?.id;

  const dataEnabled = adminPreview || (authHydrated && Boolean(userId));

  const { data, loading, reload, refreshSilent } = useWorkspaceData(
    userId,
    dataEnabled,
    adminPreview
  );
  useWorkspacePolling(
    refreshSilent,
    !adminPreview && authHydrated && Boolean(userId) && data.isRealEstate
  );
  const {
    followUps,
    addFromSource,
    updateStage,
    appendStageNote,
    setQuickReminder,
    clearReminder,
    markReminderFired,
    removeFollowUp,
  } = useWorkspaceFollowUps(userId);

  const enrichedFollowUps = useMemo(
    () => enrichFollowUpsFromSources(followUps, data.needs, data.collaborations),
    [followUps, data.needs, data.collaborations]
  );

  useFollowUpReminderScheduler(enrichedFollowUps, markReminderFired);

  const { query: searchQuery, setQuery: setSearchQuery, searched } = useWorkspaceSearch(
    data.needs,
    data.files,
    data.collaborations
  );

  const [activeTab, setActiveTab] = useState<WorkspaceColumnId>('needs');
  const [followUpTarget, setFollowUpTarget] = useState<WorkspaceFollowUpCandidate | null>(null);
  const [createCollaborationOpen, setCreateCollaborationOpen] = useState(false);

  const trackedSourceIds = useMemo(
    () => new Set(enrichedFollowUps.map((f) => f.requestId)),
    [enrichedFollowUps]
  );

  const tabCounts = useMemo(
    () => ({
      needs: data.needs.length,
      files: data.files.length,
      collaborations: data.collaborations.length,
      followups: enrichedFollowUps.length,
    }),
    [data.needs.length, data.files.length, data.collaborations.length, enrichedFollowUps.length]
  );

  if ((!adminPreview && !authHydrated) || (loading && (adminPreview ? data.needs.length === 0 && data.files.length === 0 : !data.profile))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری میزکار...
      </div>
    );
  }

  if (!adminPreview && !loading && data.profile && !data.isRealEstate) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Building2 className="size-7 text-muted-foreground/70" />
        </div>
        <h2 className="text-lg font-semibold">میزکار برای مشاوران و دفاتر املاک</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          برای استفاده از میزکار، ابتدا پروفایل کسب‌وکار املاک خود را تکمیل کنید.
        </p>
        <Button className="mt-5" asChild>
          <Link href={routeBuilder.myBusiness()}>ثبت / تکمیل کسب‌وکار</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <WorkspaceHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabCounts={tabCounts}
        unreadNotifications={unreadNotificationCount}
        actions={headerActions}
        search={<WorkspaceSearch value={searchQuery} onChange={setSearchQuery} />}
        quickAdd={<WorkspaceQuickAdd onCollaborationRequest={() => setCreateCollaborationOpen(true)} />}
      />

      <KanbanBoard
        activeTab={activeTab}
        needs={searched.needs}
        files={searched.files}
        regionalFeed={data.regionalFeed}
        collaborations={searched.collaborations}
        collaborationHasServiceArea={data.collaborationHasServiceArea}
        followUps={enrichedFollowUps}
        loading={loading}
        errors={data.errors}
        onRetry={() => void reload()}
        onAddToFollowUp={setFollowUpTarget}
        trackedSourceIds={trackedSourceIds}
        onFollowUpStageChange={updateStage}
        onFollowUpAppendNote={appendStageNote}
        onFollowUpSetReminder={setQuickReminder}
        onFollowUpClearReminder={clearReminder}
        onFollowUpRemove={removeFollowUp}
        onCreateCollaboration={() => setCreateCollaborationOpen(true)}
        businessCity={data.profile?.city}
        onAreasSaved={() => void reload()}
      />

      <CreateCollaborationDialog
        open={createCollaborationOpen}
        onOpenChange={setCreateCollaborationOpen}
        hasServiceArea={data.collaborationHasServiceArea}
        businessCity={data.profile?.city}
        onCreated={() => void reload()}
      />

      <AddToFollowUpDialog
        target={followUpTarget}
        open={followUpTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFollowUpTarget(null);
        }}
        onSubmit={(note) => {
          if (followUpTarget) addFromSource(followUpTarget, note);
        }}
      />
    </div>
  );
}
