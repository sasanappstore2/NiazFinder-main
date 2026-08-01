import type { CollaborationPostIntent } from '@prisma/client';
import type { PropertyListing } from '@/contracts/business-profile';
import type {
  WorkspaceFilingPosterKind,
  WorkspaceFilingSourceKind,
} from '@/lib/business/workspace/workspace-filing-entries';
import type { WorkspaceFilingEntry } from '@/lib/business/workspace/workspace-filing-entries';
import { RELATION_LABELS } from '@/lib/business/ecosystem';
import {
  AREA_BAND_LABELS,
  BUDGET_BAND_LABELS,
  COLLABORATION_INTENT_LABELS,
  collaborationTypeLabel,
  dealTypeLabel,
  formatCollaborationPostArea,
  PROPERTY_KIND_LABELS,
} from '@/lib/business/workspace/collaboration-posts';
import type { EcosystemConnection, EcosystemReferral } from '@/lib/business/ecosystem/types';
import {
  listingPriceDisplay,
  propertyListingDealTypeLabel,
} from '@/lib/business/real-estate-listing-deal-types';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import { listingCoverImage } from '@/lib/business/normalize-property-listing';
import { routeBuilder } from '@/config/routes';
import type {
  CollaborationPriority,
  WorkspaceCollaborationItem,
  WorkspaceData,
  WorkspaceFileItem,
  WorkspaceNeedItem,
  WorkspaceNeedSource,
} from '../types';

type LeadRow = {
  id: string;
  requestId: string;
  matchScore?: number;
  matchReasonFa?: string | null;
  conversationId?: string | null;
  chatUrl?: string | null;
  needUrl?: string;
  createdAt?: string;
  request: {
    id: string;
    title: string;
    slug?: string;
    city?: string | null;
    address?: string | null;
    status?: string;
    createdAt?: string;
    userId?: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
    } | null;
  };
};

type HubRow = {
  id: string;
  title: string;
  slug?: string;
  city?: string | null;
  budget?: string | null;
  createdAt?: string;
  userId?: string;
};

function listingColorLabel(listing: PropertyListing): string {
  const cat = propertyListingCategoryLabel(listing.categorySlug);
  if (cat?.includes('زمین') || listing.categorySlug?.includes('land')) return 'زمین';
  if (cat?.includes('ویلا') || listing.categorySlug?.includes('villa')) return 'ویلا';
  const deal = propertyListingDealTypeLabel(listing.dealType);
  if (deal.includes('رهن')) return 'رهن';
  if (deal.includes('اجاره') || deal.includes('اجاره')) return 'اجاره';
  return 'فروش';
}

export function normalizeListingItem(
  listing: PropertyListing,
  opts?: {
    workspaceId?: string;
    businessSlug?: string;
    isOwn?: boolean;
    sourceProvider?: string | null;
    sourceKind?: WorkspaceFilingSourceKind;
    posterKind?: WorkspaceFilingPosterKind;
    peerBusinessSlug?: string;
    createdAt?: string | null;
    /** Regional/imported filing — links to /f/{id} */
    regionalDetail?: boolean;
  }
): WorkspaceFileItem {
  const detailUrl = opts?.isOwn && opts.businessSlug
    ? routeBuilder.businessProduct(opts.businessSlug, listing.id)
    : opts?.peerBusinessSlug
      ? routeBuilder.businessProduct(opts.peerBusinessSlug, listing.id)
      : opts?.regionalDetail
        ? routeBuilder.filingDetail(listing.id)
        : null;

  const sourceProvider =
    opts?.sourceProvider !== undefined
      ? opts.sourceProvider
      : opts?.isOwn
        ? 'پروفایل من'
        : null;

  return {
    kind: 'file',
    id: opts?.workspaceId ?? listing.id,
    listing,
    dealLabel: propertyListingDealTypeLabel(listing.dealType),
    categoryLabel: propertyListingCategoryLabel(listing.categorySlug) ?? null,
    priceDisplay: listingPriceDisplay(listing) ?? null,
    colorLabel: listingColorLabel(listing),
    createdAt: opts?.createdAt ?? listing.postedAt ?? listing.createdAt ?? null,
    sourceProvider,
    sourceKind: opts?.sourceKind,
    posterKind: opts?.posterKind,
    detailUrl,
  };
}

export function normalizeFilingEntry(
  entry: WorkspaceFilingEntry,
  opts?: { businessSlug?: string; isOwn?: boolean }
): WorkspaceFileItem {
  return normalizeListingItem(entry.listing, {
    workspaceId: entry.workspaceId,
    businessSlug: opts?.businessSlug,
    isOwn: opts?.isOwn ?? entry.sourceKind === 'own',
    sourceProvider: entry.sourceProvider,
    sourceKind: entry.sourceKind,
    posterKind: entry.posterKind,
    peerBusinessSlug: entry.sourceKind === 'peer' ? entry.detailSlug : undefined,
    createdAt: entry.listing.postedAt ?? entry.listing.createdAt ?? null,
    regionalDetail: entry.regionalDetail,
  });
}

export function leadToNeedItem(
  lead: LeadRow,
  source: WorkspaceNeedSource,
  opts?: { isPrivate?: boolean }
): WorkspaceNeedItem {
  const req = lead.request;
  const ownerId = req.userId ?? req.user?.id ?? null;
  const userName = req.user
    ? `${req.user.firstName} ${req.user.lastName}`.trim() || null
    : null;
  const chatUrl =
    lead.chatUrl ??
    (lead.conversationId ? routeBuilder.chatConversation(lead.conversationId) : null);

  return {
    kind: 'need',
    id: lead.id,
    requestId: lead.requestId,
    title: req.title,
    location: req.city ?? req.address ?? null,
    budget: null,
    propertyType: null,
    status: req.status ?? null,
    createdAt: lead.createdAt ?? req.createdAt ?? new Date().toISOString(),
    source,
    matchScore: lead.matchScore,
    matchReasonFa: lead.matchReasonFa,
    needUrl: lead.needUrl ?? routeBuilder.need(req.id, req.title),
    conversationId: lead.conversationId,
    chatUrl,
    contactUserId: ownerId,
    userName,
    userAvatar: req.user?.avatar ?? null,
    outreachId: lead.id,
    isPrivate: opts?.isPrivate,
  };
}

export function hubRowToNeedItem(row: HubRow, bucket: string): WorkspaceNeedItem {
  return {
    kind: 'need',
    id: `hub-${bucket}-${row.id}`,
    requestId: row.id,
    title: row.title,
    location: row.city ?? null,
    budget: row.budget ?? null,
    propertyType: null,
    status: 'OPEN',
    createdAt: row.createdAt ?? new Date().toISOString(),
    source: 'hub',
    needUrl: routeBuilder.need(row.id, row.title),
    contactUserId: row.userId ?? null,
    matchReasonFa: bucket === 'urgent' ? 'فوری' : bucket === 'highValue' ? 'بودجه بالا' : null,
  };
}

export function mergeNeedItems(items: WorkspaceNeedItem[]): WorkspaceNeedItem[] {
  const byRequest = new Map<string, WorkspaceNeedItem>();
  const priority: WorkspaceNeedSource[] = ['private', 'lead', 'hub'];

  for (const item of items) {
    const existing = byRequest.get(item.requestId);
    if (!existing) {
      byRequest.set(item.requestId, item);
      continue;
    }
    const existingPri = priority.indexOf(existing.source);
    const newPri = priority.indexOf(item.source);
    if (newPri < existingPri) {
      byRequest.set(item.requestId, { ...existing, ...item, id: item.id });
    } else {
      byRequest.set(item.requestId, {
        ...item,
        ...existing,
        budget: existing.budget ?? item.budget,
        matchScore: existing.matchScore ?? item.matchScore,
        matchReasonFa: existing.matchReasonFa ?? item.matchReasonFa,
        contactUserId: existing.contactUserId ?? item.contactUserId,
        chatUrl: existing.chatUrl ?? item.chatUrl,
        userName: existing.userName ?? item.userName,
        userAvatar: existing.userAvatar ?? item.userAvatar,
        conversationId: existing.conversationId ?? item.conversationId,
      });
    }
  }

  return [...byRequest.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function referralPriority(status: EcosystemReferral['status']): CollaborationPriority {
  if (status === 'converted') return 'urgent';
  if (status === 'accepted') return 'important';
  return 'normal';
}

export function connectionToCollaboration(c: EcosystemConnection): WorkspaceCollaborationItem {
  return {
    kind: 'collaboration',
    id: `conn-${c.id}`,
    businessName: c.note?.trim() || c.targetBusinessId,
    collaborationType: RELATION_LABELS[c.type] ?? c.type,
    area: c.note ?? null,
    description: c.note ?? null,
    createdAt: c.createdAt,
    priority: 'normal',
    targetBusinessId: c.targetBusinessId,
    variant: 'connection',
  };
}

export function referralToCollaboration(r: EcosystemReferral): WorkspaceCollaborationItem {
  return {
    kind: 'collaboration',
    id: `ref-${r.id}`,
    businessName: r.toBusinessId,
    collaborationType: 'ارجاع',
    area: null,
    description: r.requestId ? `نیاز: ${r.requestId}` : null,
    createdAt: r.createdAt,
    priority: referralPriority(r.status),
    targetBusinessId: r.toBusinessId,
    variant: 'referral',
  };
}

type CollaborationPostRow = {
  id: string;
  intent: keyof typeof COLLABORATION_INTENT_LABELS;
  headline: string;
  note: string | null;
  scope: 'REGIONAL' | 'CROSS_REGIONAL';
  city: string | null;
  neighborhood: string | null;
  neighborhoodId?: string | null;
  targetCity: string | null;
  targetNeighborhood: string | null;
  targetAreasJson?: string | null;
  subjectKind?: 'CLIENT' | 'PROPERTY' | 'JOINT_VISIT' | null;
  dealType?: string | null;
  propertyKind?: keyof typeof PROPERTY_KIND_LABELS | null;
  areaBand?: keyof typeof AREA_BAND_LABELS | null;
  budgetBand?: keyof typeof BUDGET_BAND_LABELS | null;
  createdAt: Date | string;
  author: {
    id: string;
    userId: string;
    name: string;
    slug: string;
    phone: string | null;
    whatsapp?: string | null;
    chatEnabled: boolean;
  };
};

export function postToCollaborationItem(post: CollaborationPostRow): WorkspaceCollaborationItem {
  return {
    kind: 'collaboration',
    id: `post-${post.id}`,
    businessName: post.author.name,
    collaborationType: collaborationTypeLabel({
      subjectKind: post.subjectKind ?? null,
      intent: post.intent as CollaborationPostIntent,
    }),
    area: formatCollaborationPostArea(post),
    headline: post.headline,
    description: post.headline,
    note: null,
    createdAt:
      typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString(),
    priority: 'normal',
    targetBusinessId: post.author.id,
    variant: 'post',
    scope: post.scope === 'REGIONAL' ? 'regional' : 'cross_regional',
    authorUserId: post.author.userId,
    authorSlug: post.author.slug,
    hasPhone: Boolean(post.author.phone?.trim() || post.author.whatsapp?.trim()),
    chatEnabled: post.author.chatEnabled,
    dealTypeLabel: post.dealType ? dealTypeLabel(post.dealType) : null,
    propertyKindLabel: post.propertyKind ? PROPERTY_KIND_LABELS[post.propertyKind] : null,
    areaBandLabel: post.areaBand ? AREA_BAND_LABELS[post.areaBand] : null,
    budgetBandLabel: post.budgetBand ? BUDGET_BAND_LABELS[post.budgetBand] : null,
  };
}

export function collectFilterOptions(
  needs: WorkspaceNeedItem[],
  files: WorkspaceFileItem[]
): WorkspaceData['filterOptions'] {
  const cities = new Set<string>();
  const regions = new Set<string>();
  const propertyTypes = new Set<string>();
  const dealTypes = new Set<string>();

  for (const n of needs) {
    if (n.location) cities.add(n.location);
    if (n.propertyType) propertyTypes.add(n.propertyType);
  }
  for (const f of files) {
    if (f.listing.location) regions.add(f.listing.location);
    if (f.listing.cityId) cities.add(f.listing.cityId);
    if (f.categoryLabel) propertyTypes.add(f.categoryLabel);
    if (f.dealLabel) dealTypes.add(f.dealLabel);
    if (f.colorLabel) dealTypes.add(f.colorLabel);
  }

  return {
    cities: [...cities].sort(),
    regions: [...regions].sort(),
    propertyTypes: [...propertyTypes].sort(),
    dealTypes: [...dealTypes].sort(),
  };
}

export { listingCoverImage };
