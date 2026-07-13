import { db } from '@/lib/db';
import { routeBuilder } from '@/config/routes';
import { parseJsonObject } from '@/lib/business/json-fields';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import type { EcosystemExtension } from '@/lib/business/ecosystem/types';
import type { WorkspaceFollowUpRecord } from '@/lib/business/ecosystem/types';
import {
  formatServiceAreaLabel,
  resolveRegionalFilingsFeedStatus,
} from '@/lib/filing/adapters/workspace-feed';
import { formatFilingPreferencesSummary } from '@/lib/business/workspace/filing-preferences';
import { buildWorkspaceFilingEntries } from '@/lib/filing/adapters/workspace-entries';
import {
  isCollaborationPostVisibleToAreas,
} from '@/lib/business/workspace/collaboration-posts';
import {
  collectFilterOptions,
  connectionToCollaboration,
  leadToNeedItem,
  mergeNeedItems,
  normalizeFilingEntry,
  postToCollaborationItem,
  referralToCollaboration,
} from '@/components/workspace/lib/normalize-workspace-data';
import type {
  WorkspaceCollaborationItem,
  WorkspaceData,
  WorkspaceFollowUpItem,
  WorkspaceNeedItem,
} from '@/components/workspace/types';
import { listPrivateLeads } from '@/lib/smart-matching/need-chat-session';

function readEcosystem(extensions: string): EcosystemExtension {
  try {
    return (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
  } catch {
    return {};
  }
}

function parseOccupationSlugs(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function followUpRecordToItem(record: WorkspaceFollowUpRecord): WorkspaceFollowUpItem {
  return {
    kind: 'followup',
    id: record.id,
    stage: record.stage,
    subject: record.subject,
    note: record.note,
    customer: record.customer,
    property: record.property,
    requestId: record.requestId,
    needUrl: record.needUrl,
    sourceKind: record.sourceKind,
    nextActionDate: record.nextActionDate,
    owner: record.owner,
    status: record.status,
    createdAt: record.createdAt,
    stageNotes: record.stageNotes,
    reminder: record.reminder,
    contactUserId: record.contactUserId,
    chatUrl: record.chatUrl,
    contactRequestId: record.contactRequestId,
    authorSlug: record.authorSlug,
    hasPhone: record.hasPhone,
    chatEnabled: record.chatEnabled,
  };
}

export async function loadWorkspaceDataForUser(userId: string): Promise<WorkspaceData> {
  const profile = await db.businessProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      categorySlugs: true,
      extensions: true,
      userId: true,
    },
  });

  if (!profile) {
    return {
      profile: null,
      isRealEstate: false,
      needs: [],
      files: [],
      regionalFeed: {
        regionLabel: null,
        hasServiceArea: false,
        feedStatus: 'unconfigured',
      },
      collaborations: [],
      collaborationHasServiceArea: false,
      followUps: [],
      errors: {},
      filterOptions: { cities: [], regions: [], propertyTypes: [], dealTypes: [] },
    };
  }

  const occupationSlugs = parseOccupationSlugs(profile.categorySlugs);
  const isRe = isRealEstateBusiness(occupationSlugs);
  const ecosystem = readEcosystem(profile.extensions);
  const areas = ecosystem.serviceArea?.areas ?? [];
  const filingPreferences = ecosystem.serviceArea?.filingPreferences;
  const regionLabel = formatServiceAreaLabel(areas);
  const regionalStatus = resolveRegionalFilingsFeedStatus(areas);

  const errors: WorkspaceData['errors'] = {};

  let needs: WorkspaceNeedItem[] = [];
  try {
    const [leads, privateLeads] = await Promise.all([
      db.needLeadOutreach.findMany({
        where: { businessUserId: userId, status: 'SENT' },
        orderBy: { createdAt: 'desc' },
        take: 40,
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
      listPrivateLeads(userId),
    ]);

    const leadItems = leads.map((l) =>
      leadToNeedItem(
        {
          id: l.id,
          requestId: l.requestId,
          matchScore: l.matchScore ?? undefined,
          matchReasonFa: l.matchReasonFa,
          conversationId: l.conversationId,
          chatUrl: l.conversationId ? routeBuilder.chatConversation(l.conversationId) : null,
          needUrl: routeBuilder.need(l.request.id, l.request.title),
          createdAt: l.createdAt.toISOString(),
          request: {
            ...l.request,
            createdAt: l.request.createdAt.toISOString(),
            user: l.request.user,
          },
        },
        'lead'
      )
    );

    const privateItems = privateLeads.map((l) =>
      leadToNeedItem(
        {
          id: l.id,
          requestId: l.requestId,
          matchScore: l.matchScore ?? undefined,
          matchReasonFa: l.matchReasonFa,
          conversationId: l.conversationId,
          needUrl: routeBuilder.need(l.request.id, l.request.title),
          createdAt: new Date().toISOString(),
          request: {
            id: l.request.id,
            title: l.request.title,
            slug: l.request.slug ?? undefined,
            city: l.request.city,
            status: l.request.status,
          },
        },
        'private',
        { isPrivate: true }
      )
    );

    needs = mergeNeedItems([...privateItems, ...leadItems]);
  } catch (e) {
    console.error('workspace needs load error:', e);
    errors.needs = 'خطا در بارگذاری نیازها';
  }

  let files: WorkspaceData['files'] = [];
  let feedStatus = regionalStatus;
  try {
    const { entries } = await buildWorkspaceFilingEntries({
      profileId: profile.id,
      profileSlug: profile.slug,
      extensions: profile.extensions,
      areas,
      filingPreferences,
    });
    files = entries.map((entry) =>
      normalizeFilingEntry(entry, {
        businessSlug: profile.slug,
        isOwn: entry.sourceKind === 'own',
      })
    );
    if (files.length > 0) feedStatus = 'active';
  } catch (e) {
    console.error('workspace files load error:', e);
    errors.files = 'خطا در بارگذاری فایل‌ها';
  }

  let collaborations: WorkspaceCollaborationItem[] = [];
  try {
    const network = ecosystem.network;
    const fromNetwork = [
      ...(network?.connections ?? []).map(connectionToCollaboration),
      ...(network?.referralsSent ?? []).map(referralToCollaboration),
    ];

    const posts = await db.regionalCollaborationPost.findMany({
      where: { status: 'active', authorProfileId: { not: profile.id } },
      orderBy: { createdAt: 'desc' },
      take: 80,
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
    });

    const fromPosts = posts
      .filter((post) => isCollaborationPostVisibleToAreas(post, areas))
      .map((post) =>
        postToCollaborationItem({
          id: post.id,
          intent: post.intent,
          headline: post.headline,
          note: post.note,
          scope: post.scope,
          city: post.city,
          neighborhood: post.neighborhood,
          neighborhoodId: post.neighborhoodId,
          targetCity: post.targetCity,
          targetNeighborhood: post.targetNeighborhood,
          targetAreasJson: post.targetAreasJson,
          subjectKind: post.subjectKind,
          dealType: post.dealType,
          propertyKind: post.propertyKind,
          areaBand: post.areaBand,
          budgetBand: post.budgetBand,
          createdAt: post.createdAt,
          author: {
            id: post.author.id,
            userId: post.author.userId,
            name: post.author.name,
            slug: post.author.slug,
            phone: post.author.phone,
            whatsapp: post.author.whatsapp,
            chatEnabled: post.author.chatEnabled,
          },
        })
      );

    collaborations = [...fromPosts, ...fromNetwork].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (e) {
    console.error('workspace collaborations load error:', e);
    errors.collaborations = 'خطا در بارگذاری همکاری‌ها';
  }

  const followUps = (ecosystem.workspaceFollowUps ?? []).map(followUpRecordToItem);

  return {
    profile: {
      slug: profile.slug,
      name: profile.name,
      city: profile.city ?? '',
      occupationSlugs,
      userId: profile.userId,
    },
    isRealEstate: isRe,
    needs,
    files,
    regionalFeed: {
      regionLabel,
      hasServiceArea: areas.length > 0,
      feedStatus,
      filingPreferencesSummary: formatFilingPreferencesSummary(filingPreferences),
    },
    collaborations,
    collaborationHasServiceArea: areas.length > 0,
    followUps,
    errors,
    filterOptions: collectFilterOptions(needs, files),
  };
}

/** Admin preview — sample workspace without a business profile. */
export function buildAdminPreviewWorkspaceData(): WorkspaceData {
  return {
    profile: {
      slug: 'preview',
      name: 'پیش‌نمایش میزکار',
      city: 'مشهد',
      occupationSlugs: ['real-estate-agent'],
      userId: 'preview',
    },
    isRealEstate: true,
    needs: [],
    files: [],
    regionalFeed: {
      regionLabel: null,
      hasServiceArea: false,
      feedStatus: 'unconfigured',
    },
    collaborations: [],
    collaborationHasServiceArea: false,
    followUps: [],
    errors: {},
    filterOptions: { cities: [], regions: [], propertyTypes: [], dealTypes: [] },
  };
}
