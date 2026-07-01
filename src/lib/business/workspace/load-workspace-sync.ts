import type { PropertyListing } from '@/contracts/business-profile';
import { db } from '@/lib/db';
import { routeBuilder } from '@/config/routes';
import { parseJsonArray } from '@/lib/business/json-fields';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import type { EcosystemExtension } from '@/lib/business/ecosystem';
import { listPrivateLeads } from '@/lib/smart-matching/need-chat-session';
import { isCollaborationPostVisibleToAreas } from '@/lib/business/workspace/collaboration-posts';
import {
  collaborationMatchesFilingPreferences,
  formatFilingPreferencesSummary,
} from '@/lib/business/workspace/filing-preferences';
import {
  formatServiceAreaLabel,
  listRegionalFilingsForWorkspace,
  resolveRegionalFilingsFeedStatus,
} from '@/lib/business/workspace/regional-filings';
import { buildWorkspaceFilingEntries } from '@/lib/business/workspace/workspace-filing-entries';
import type { WorkspaceFilingEntry } from '@/lib/business/workspace/workspace-filing-entries';
import type { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';

const POST_TTL_DAYS = 14;
const LEADS_LIMIT = 30;

const HUB_SELECT = {
  id: true,
  title: true,
  slug: true,
  city: true,
  budgetMax: true,
  createdAt: true,
  userId: true,
} as const;

function readEcosystem(extensions: string): EcosystemExtension {
  try {
    return (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
  } catch {
    return {};
  }
}

function hubRow(r: {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  budgetMax: bigint | null;
  createdAt: Date;
  userId: string;
}) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    city: r.city,
    budget: r.budgetMax != null ? `${r.budgetMax.toString()} تومان` : null,
    createdAt: r.createdAt.toISOString(),
    userId: r.userId,
  };
}

export type WorkspaceSyncPayload = {
  syncedAt: number;
  leads: {
    id: string;
    requestId: string;
    matchScore?: number;
    matchReasonFa?: string | null;
    conversationId?: string | null;
    chatUrl?: string | null;
    needUrl?: string;
    createdAt?: Date;
    request: unknown;
  }[];
  privateLeads: Awaited<ReturnType<typeof listPrivateLeads>>;
  hub: {
    matching: ReturnType<typeof hubRow>[];
    urgent: ReturnType<typeof hubRow>[];
    nearby: ReturnType<typeof hubRow>[];
    highValue: ReturnType<typeof hubRow>[];
  };
  filings: {
    entries: WorkspaceFilingEntry[];
    ownListingIds: string[];
    businessSlug: string;
    regionLabel: string | null;
    hasServiceArea: boolean;
    feedStatus: 'unconfigured' | 'pending' | 'active';
    filingPreferencesSummary: string | null;
  };
  collaborations: {
    posts: unknown[];
    hasServiceArea: boolean;
  };
};

/** Single server-side bundle for workspace polling (one HTTP round-trip per client tick). */
export async function loadWorkspaceSync(
  user: { id: string },
  profile: Awaited<ReturnType<typeof loadMyBusinessProfile>>
): Promise<WorkspaceSyncPayload> {
  const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
  const isRE = isRealEstateBusiness(occupationSlugs);

  const emptyFilings = {
    entries: [] as WorkspaceFilingEntry[],
    ownListingIds: [] as string[],
    businessSlug: profile.slug,
    regionLabel: null as string | null,
    hasServiceArea: false,
    feedStatus: 'unconfigured' as const,
    filingPreferencesSummary: null as string | null,
  };

  if (!isRE) {
    return {
      syncedAt: Date.now(),
      leads: [],
      privateLeads: [],
      hub: { matching: [], urgent: [], nearby: [], highValue: [] },
      filings: emptyFilings,
      collaborations: { posts: [], hasServiceArea: false },
    };
  }

  const ecosystem = readEcosystem(profile.extensions);
  const areas = ecosystem.serviceArea?.areas ?? [];
  const filingPreferences = ecosystem.serviceArea?.filingPreferences;
  const regionLabel = formatServiceAreaLabel(areas);
  const city = profile.city ?? undefined;
  const cityWhere = city ? { city } : {};
  const baseWhere = { status: 'OPEN' as const, moderationStatus: 'APPROVED' as const };
  const since = new Date();
  since.setDate(since.getDate() - POST_TTL_DAYS);

  const safeRegionalFilings = async () => {
    try {
      return await listRegionalFilingsForWorkspace(areas);
    } catch (error) {
      console.error('listRegionalFilingsForWorkspace error:', error);
      return {
        listings: [] as PropertyListing[],
        feedStatus: resolveRegionalFilingsFeedStatus(areas),
      };
    }
  };

  const safePrivateLeads = async () => {
    try {
      return await listPrivateLeads(user.id);
    } catch (error) {
      console.error('listPrivateLeads error:', error);
      return [];
    }
  };

  const [
    leadRows,
    privateLeads,
    matching,
    urgent,
    nearby,
    highValue,
    regionalResult,
    collabRows,
  ] = await Promise.all([
    db.needLeadOutreach.findMany({
      where: { businessUserId: user.id, status: 'SENT' },
      orderBy: { createdAt: 'desc' },
      take: LEADS_LIMIT,
      include: {
        request: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            address: true,
            status: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    }),
    safePrivateLeads(),
    db.serviceRequest.findMany({
      where: { ...baseWhere, ...cityWhere },
      select: HUB_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    db.serviceRequest.findMany({
      where: { ...baseWhere, priority: { in: ['HIGH', 'URGENT'] } },
      select: HUB_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    db.serviceRequest.findMany({
      where: { ...baseWhere, ...cityWhere },
      select: HUB_SELECT,
      orderBy: { viewCount: 'desc' },
      take: 8,
    }),
    db.serviceRequest.findMany({
      where: { ...baseWhere, budgetMax: { not: null } },
      select: HUB_SELECT,
      orderBy: { budgetMax: 'desc' },
      take: 8,
    }),
    safeRegionalFilings(),
    db.regionalCollaborationPost.findMany({
      where: { status: 'active', createdAt: { gte: since } },
      include: {
        author: {
          select: {
            id: true,
            userId: true,
            name: true,
            slug: true,
            phone: true,
            whatsapp: true,
            chatEnabled: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
  ]);

  const leads = leadRows.map((l) => ({
    id: l.id,
    requestId: l.requestId,
    matchScore: l.matchScore,
    matchReasonFa: l.matchReasonFa,
    conversationId: l.conversationId,
    chatUrl: l.conversationId ? routeBuilder.chatConversation(l.conversationId) : null,
    needUrl: routeBuilder.need(l.request.id, l.request.title),
    request: l.request,
    createdAt: l.createdAt,
  }));

  const { entries, ownListingIds } = await buildWorkspaceFilingEntries({
    profileId: profile.id,
    profileSlug: profile.slug,
    extensions: profile.extensions,
    areas,
    filingPreferences,
  });
  const feedStatus =
    entries.length > 0 ? ('active' as const) : regionalResult.feedStatus;

  const visiblePosts = collabRows.filter(
    (post) =>
      (post.authorProfileId === profile.id ||
        isCollaborationPostVisibleToAreas(post, areas)) &&
      collaborationMatchesFilingPreferences(post, filingPreferences)
  );

  return {
    syncedAt: Date.now(),
    leads,
    privateLeads,
    hub: {
      matching: matching.map(hubRow),
      urgent: urgent.map(hubRow),
      nearby: nearby.map(hubRow),
      highValue: highValue.map(hubRow),
    },
    filings: {
      entries,
      ownListingIds,
      businessSlug: profile.slug,
      regionLabel,
      hasServiceArea: areas.length > 0,
      feedStatus,
      filingPreferencesSummary: formatFilingPreferencesSummary(filingPreferences),
    },
    collaborations: {
      posts: visiblePosts,
      hasServiceArea: areas.length > 0,
    },
  };
}
