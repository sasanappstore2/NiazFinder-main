import type { PropertyListing } from '@/contracts/business-profile';

export type WorkspaceColumnId = 'needs' | 'files' | 'collaborations' | 'followups';

export type FollowUpStageId =
  | 'new'
  | 'contacted'
  | 'visited'
  | 'negotiating'
  | 'closed';

export type FollowUpStageNote = {
  id: string;
  stage: FollowUpStageId;
  text: string;
  createdAt: string;
};

export type FollowUpReminder = {
  id: string;
  stage: FollowUpStageId;
  label: string;
  dueAt: string;
  firedAt?: string | null;
};

export const FOLLOW_UP_STAGES: Array<{ id: FollowUpStageId; label: string }> = [
  { id: 'new', label: 'جدید' },
  { id: 'contacted', label: 'تماس گرفته شد' },
  { id: 'visited', label: 'بازدید انجام شد' },
  { id: 'negotiating', label: 'در حال مذاکره' },
  { id: 'closed', label: 'بسته شد' },
];

export type WorkspaceNeedSource = 'lead' | 'private' | 'hub';

export type WorkspaceNeedItem = {
  kind: 'need';
  id: string;
  requestId: string;
  title: string;
  location: string | null;
  budget: string | null;
  propertyType: string | null;
  status: string | null;
  createdAt: string;
  source: WorkspaceNeedSource;
  matchScore?: number;
  matchReasonFa?: string | null;
  needUrl: string;
  conversationId?: string | null;
  chatUrl?: string | null;
  userAvatar?: string | null;
  userName?: string | null;
  /** Need owner user id — for call/chat from workspace cards */
  contactUserId?: string | null;
  outreachId?: string;
  isPrivate?: boolean;
};

export type WorkspaceFileItem = {
  kind: 'file';
  id: string;
  listing: PropertyListing;
  dealLabel: string;
  categoryLabel: string | null;
  priceDisplay: string | null;
  colorLabel: string;
  createdAt: string | null;
  /** Filing provider name when sourced from imported feed (e.g. دیوار، شیپور). */
  sourceProvider?: string | null;
  /** own | peer consultant | imported regional feed */
  sourceKind?: 'own' | 'peer' | 'import';
  /** Consultant vs owner poster on imported listings */
  posterKind?: 'own' | 'broker' | 'owner';
  detailUrl?: string | null;
};

export type WorkspaceRegionalFeedMeta = {
  regionLabel: string | null;
  hasServiceArea: boolean;
  feedStatus: 'unconfigured' | 'pending' | 'active';
  filingPreferencesSummary?: string | null;
};

export type CollaborationPriority = 'normal' | 'important' | 'urgent';

export type WorkspaceCollaborationItem = {
  kind: 'collaboration';
  id: string;
  businessName: string;
  collaborationType: string;
  area: string | null;
  description: string | null;
  headline?: string | null;
  note?: string | null;
  createdAt: string;
  priority: CollaborationPriority;
  targetBusinessId: string;
  variant: 'connection' | 'referral' | 'post';
  scope?: 'regional' | 'cross_regional';
  authorUserId?: string;
  authorSlug?: string | null;
  hasPhone?: boolean;
  chatEnabled?: boolean;
  dealTypeLabel?: string | null;
  propertyKindLabel?: string | null;
  areaBandLabel?: string | null;
  budgetBandLabel?: string | null;
};

export type WorkspaceFollowUpItem = {
  kind: 'followup';
  id: string;
  stage: FollowUpStageId;
  subject: string;
  note: string;
  customer: string | null;
  property: string | null;
  /** Unique source key — need requestId or `collab:{id}` */
  requestId: string;
  needUrl: string;
  sourceKind?: 'need' | 'collaboration';
  nextActionDate: string | null;
  owner: string | null;
  status: string;
  createdAt: string;
  stageNotes?: FollowUpStageNote[];
  reminder?: FollowUpReminder | null;
  contactUserId?: string | null;
  chatUrl?: string | null;
  /** Service request id for contact APIs (not `collab:*`) */
  contactRequestId?: string | null;
  authorSlug?: string | null;
  hasPhone?: boolean;
  chatEnabled?: boolean;
};

export type WorkspaceItem =
  | WorkspaceNeedItem
  | WorkspaceFileItem
  | WorkspaceCollaborationItem
  | WorkspaceFollowUpItem;

export type WorkspaceFiltersState = {
  city: string;
  region: string;
  propertyType: string;
  dealType: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_WORKSPACE_FILTERS: WorkspaceFiltersState = {
  city: 'all',
  region: 'all',
  propertyType: 'all',
  dealType: 'all',
  priceMin: '',
  priceMax: '',
  dateFrom: '',
  dateTo: '',
};

export type WorkspaceBusinessProfile = {
  slug: string;
  name: string;
  city: string;
  occupationSlugs: string[];
  userId: string;
};

export type WorkspaceColumnErrors = {
  needs?: string;
  files?: string;
  collaborations?: string;
};

export type WorkspaceData = {
  profile: WorkspaceBusinessProfile | null;
  isRealEstate: boolean;
  needs: WorkspaceNeedItem[];
  files: WorkspaceFileItem[];
  regionalFeed: WorkspaceRegionalFeedMeta;
  collaborations: WorkspaceCollaborationItem[];
  collaborationHasServiceArea: boolean;
  followUps: WorkspaceFollowUpItem[];
  errors: WorkspaceColumnErrors;
  filterOptions: {
    cities: string[];
    regions: string[];
    propertyTypes: string[];
    dealTypes: string[];
  };
};

export type WorkspaceBoardState = {
  needs: string[];
  files: string[];
  collaborations: string[];
};
