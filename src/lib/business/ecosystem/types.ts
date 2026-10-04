/**
 * Real Estate Ecosystem — shared types.
 *
 * Everything is stored inside `BusinessProfile.extensions.ecosystem` (JSON) so the
 * system is fully configurable and requires no schema migration. The same shape
 * is category-agnostic and can later back vehicles / jobs / services verticals.
 */

// ─── Phase 2: Reputation ─────────────────────────────────────────────────────

export type ReputationLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ReputationComponentScores {
  profileCompleteness: number;
  activeListings: number;
  successfulMatches: number;
  userEngagement: number;
  responseSpeed: number;
  reviews: number;
  verification: number;
  activityFrequency: number;
}

export interface ReputationResult {
  /** 0–100 */
  score: number;
  level: ReputationLevel;
  components: ReputationComponentScores;
  /** Each weighted contribution (already multiplied by weight) */
  breakdown: Array<{ key: keyof ReputationComponentScores; label: string; value: number; max: number }>;
}

// ─── Phase 6: Verification ───────────────────────────────────────────────────

export type VerificationLevel = 'basic' | 'verified' | 'professional' | 'enterprise';

export type VerificationDocumentType =
  | 'national_id'
  | 'business_license'
  | 'real_estate_license'
  | 'union_membership'
  | 'certificate'
  | 'tax_certificate'
  | 'other';

export type VerificationDocumentStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationDocument {
  id: string;
  type: VerificationDocumentType;
  title: string;
  fileUrl: string;
  status: VerificationDocumentStatus;
  uploadedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface VerificationState {
  level: VerificationLevel;
  documents: VerificationDocument[];
  /** Manually granted badges by super admin */
  manualBadges?: string[];
}

// ─── Phase 4: Specialization ─────────────────────────────────────────────────

export type SpecializationTag =
  | 'luxury'
  | 'commercial'
  | 'office'
  | 'industrial'
  | 'land'
  | 'villa'
  | 'apartment'
  | 'investment';

// ─── Phase 5: Service Area ───────────────────────────────────────────────────

export interface ServiceAreaEntry {
  city: string;
  /** Managed city id — for geo/matching. */
  cityId?: string;
  district?: string;
  neighborhood?: string;
  /** Managed neighborhood id — primary key for need matching. */
  neighborhoodId?: string;
  /** 1–5 self/admin declared coverage strength */
  strength?: number;
}

export interface ServiceAreaState {
  areas: ServiceAreaEntry[];
  /** Workspace column filters — empty arrays mean "show all". */
  filingPreferences?: WorkspaceFilingPreferences;
}

export type WorkspacePropertyKind = 'apartment' | 'villa' | 'land' | 'office' | 'shop' | 'commercial';

export interface WorkspaceFilingPreferences {
  dealTypes?: Array<
    'sell' | 'rent_rahn_ejare' | 'rent_rahn_full' | 'rent_short_term'
  >;
  propertyKinds?: WorkspacePropertyKind[];
}

/** Kanban column ordering persisted in extensions.workspace */
export interface WorkspaceBoardState {
  needs: string[];
  files: string[];
  collaborations: string[];
}

export type WorkspaceFollowUpStageId =
  | 'new'
  | 'contacted'
  | 'visited'
  | 'negotiating'
  | 'closed';

export interface WorkspaceFollowUpStageNote {
  id: string;
  stage: WorkspaceFollowUpStageId;
  text: string;
  createdAt: string;
}

export interface WorkspaceFollowUpReminder {
  id: string;
  stage: WorkspaceFollowUpStageId;
  label: string;
  dueAt: string;
  firedAt?: string | null;
}

/** Persisted in ecosystem.workspaceFollowUps (JSON, no Prisma migration). */
export interface WorkspaceFollowUpRecord {
  id: string;
  stage: WorkspaceFollowUpStageId;
  subject: string;
  note: string;
  customer: string | null;
  property: string | null;
  requestId: string;
  needUrl: string;
  sourceKind?: 'need' | 'collaboration';
  nextActionDate: string | null;
  owner: string | null;
  status: string;
  createdAt: string;
  stageNotes?: WorkspaceFollowUpStageNote[];
  reminder?: WorkspaceFollowUpReminder | null;
  contactUserId?: string | null;
  chatUrl?: string | null;
  contactRequestId?: string | null;
  authorSlug?: string | null;
  hasPhone?: boolean;
  chatEnabled?: boolean;
}

// ─── Phase 1 + 7: Ecosystem / Network Graph ──────────────────────────────────

export type EcosystemRelationType =
  | 'partner'
  | 'referral'
  | 'subcontractor'
  | 'supplier'
  | 'affiliate';

export interface EcosystemConnection {
  id: string;
  /** target BusinessProfile id */
  targetBusinessId: string;
  type: EcosystemRelationType;
  note?: string;
  createdAt: string;
}

export interface EcosystemReferral {
  id: string;
  toBusinessId: string;
  requestId?: string;
  status: 'sent' | 'accepted' | 'converted' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface NetworkGraphState {
  connections: EcosystemConnection[];
  referralsSent: EcosystemReferral[];
}

// ─── Phase 8: Knowledge Hub ──────────────────────────────────────────────────

export type KnowledgeArticleType = 'article' | 'guide' | 'market_report';

export interface KnowledgeArticle {
  id: string;
  type: KnowledgeArticleType;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  coverImage?: string;
  published: boolean;
  publishedAt?: string;
  tags?: string[];
}

export interface KnowledgeHubState {
  articles: KnowledgeArticle[];
}

// ─── Aggregate ───────────────────────────────────────────────────────────────

export interface EcosystemExtension {
  specializations?: SpecializationTag[];
  verification?: VerificationState;
  serviceArea?: ServiceAreaState;
  network?: NetworkGraphState;
  knowledge?: KnowledgeHubState;
  /** Cached reputation snapshot (recomputed server-side) */
  reputation?: { score: number; level: ReputationLevel; computedAt: string };
  /** Workspace follow-up pipeline cards (JSON storage). */
  workspaceFollowUps?: WorkspaceFollowUpRecord[];
}
