'use client';

import type { WorkspaceSyncPayload } from '@/lib/business/workspace/load-workspace-sync';
import type { WorkspaceFilingEntry } from '@/lib/business/workspace/workspace-filing-entries';
import {
  collectFilterOptions,
  hubRowToNeedItem,
  leadToNeedItem,
  mergeNeedItems,
  normalizeFilingEntry,
  postToCollaborationItem,
} from '../lib/normalize-workspace-data';
import type { WorkspaceData } from '../types';

type BusinessMeResponse = {
  slug: string;
  name: string;
  city: string;
  occupationSlugs: string[];
  error?: string;
};

type WorkspaceProfile = NonNullable<WorkspaceData['profile']>;

export function mergeWorkspaceSyncPayload(
  profile: WorkspaceProfile,
  sync: WorkspaceSyncPayload,
  _prevErrors: WorkspaceData['errors'] = {}
): WorkspaceData {
  const needCandidates = [
    ...sync.leads.map((l) => leadToNeedItem(l as Parameters<typeof leadToNeedItem>[0], 'lead')),
    ...sync.privateLeads.map((l) =>
      leadToNeedItem(l as Parameters<typeof leadToNeedItem>[0], 'private', { isPrivate: true })
    ),
  ];

  for (const row of sync.hub.matching ?? []) {
    needCandidates.push(hubRowToNeedItem(row, 'matching'));
  }
  for (const row of sync.hub.urgent ?? []) {
    needCandidates.push(hubRowToNeedItem(row, 'urgent'));
  }
  for (const row of sync.hub.nearby ?? []) {
    needCandidates.push(hubRowToNeedItem(row, 'nearby'));
  }
  for (const row of sync.hub.highValue ?? []) {
    needCandidates.push(hubRowToNeedItem(row, 'highValue'));
  }

  const needs = mergeNeedItems(needCandidates);

  const ownIds = new Set(sync.filings.ownListingIds ?? []);
  const slug = sync.filings.businessSlug ?? profile.slug;
  const files = (sync.filings.entries ?? []).map((entry: WorkspaceFilingEntry) =>
    normalizeFilingEntry(entry, {
      businessSlug: slug,
      isOwn: ownIds.has(entry.listing.id),
    })
  );

  const regionalFeed = {
    regionLabel: sync.filings.regionLabel,
    hasServiceArea: sync.filings.hasServiceArea,
    feedStatus: sync.filings.feedStatus,
    filingPreferencesSummary: sync.filings.filingPreferencesSummary ?? null,
  };

  const collaborations = (sync.collaborations.posts ?? []).map((post) =>
    postToCollaborationItem(post as Parameters<typeof postToCollaborationItem>[0])
  );

  return {
    profile,
    isRealEstate: true,
    needs,
    files,
    regionalFeed,
    collaborations,
    collaborationHasServiceArea: sync.collaborations.hasServiceArea,
    followUps: [],
    errors: {},
    filterOptions: collectFilterOptions(needs, files),
  };
}

export type { BusinessMeResponse };
