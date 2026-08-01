import { z } from 'zod';

/**
 * H2 — Zod validation for owner-editable ecosystem payloads.
 *
 * Caps array lengths and string sizes to bound JSON growth in
 * `BusinessProfile.extensions` (also mitigates H1) and rejects malformed input.
 * Enums mirror `./types.ts`.
 */

const LIMIT = {
  specializations: 8,
  serviceAreas: 200,
  connections: 100,
  referrals: 500,
  articles: 100,
  documents: 30,
  articleTags: 20,
  id: 64,
  shortText: 200,
  mediumText: 500,
  longText: 20_000,
  url: 2_000,
  isoDate: 40,
} as const;

export const specializationTagSchema = z.enum([
  'luxury',
  'commercial',
  'office',
  'industrial',
  'land',
  'villa',
  'apartment',
  'investment',
]);

export const specializationsSchema = z.array(specializationTagSchema).max(LIMIT.specializations);

export const serviceAreaEntrySchema = z.object({
  city: z.string().trim().min(1).max(100),
  cityId: z.string().trim().max(64).optional(),
  district: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  neighborhoodId: z.string().trim().max(64).optional(),
  strength: z.number().int().min(1).max(5).optional(),
});

export const workspacePropertyKindSchema = z.enum([
  'apartment',
  'villa',
  'land',
  'commercial',
]);

export const workspaceFilingDealTypeSchema = z.enum([
  'sell',
  'rent_rahn_ejare',
  'rent_rahn_full',
  'rent_short_term',
]);

export const workspaceFilingPreferencesSchema = z.object({
  dealTypes: z.array(workspaceFilingDealTypeSchema).max(4).optional(),
  propertyKinds: z.array(workspacePropertyKindSchema).max(4).optional(),
});

export const serviceAreaSchema = z.object({
  areas: z.array(serviceAreaEntrySchema).max(LIMIT.serviceAreas),
  filingPreferences: workspaceFilingPreferencesSchema.optional(),
});

export const ecosystemConnectionSchema = z.object({
  id: z.string().min(1).max(LIMIT.id),
  targetBusinessId: z.string().min(1).max(LIMIT.id),
  type: z.enum(['partner', 'referral', 'subcontractor', 'supplier', 'affiliate']),
  note: z.string().max(LIMIT.shortText).optional(),
  createdAt: z.string().max(LIMIT.isoDate),
});

export const ecosystemReferralSchema = z.object({
  id: z.string().min(1).max(LIMIT.id),
  toBusinessId: z.string().min(1).max(LIMIT.id),
  requestId: z.string().max(LIMIT.id).optional(),
  status: z.enum(['sent', 'accepted', 'converted', 'rejected']),
  createdAt: z.string().max(LIMIT.isoDate),
  resolvedAt: z.string().max(LIMIT.isoDate).optional(),
});

export const networkSchema = z.object({
  connections: z.array(ecosystemConnectionSchema).max(LIMIT.connections),
  referralsSent: z.array(ecosystemReferralSchema).max(LIMIT.referrals),
});

export const knowledgeArticleSchema = z.object({
  id: z.string().min(1).max(LIMIT.id),
  type: z.enum(['article', 'guide', 'market_report']),
  title: z.string().trim().min(1).max(LIMIT.shortText),
  slug: z.string().trim().min(1).max(LIMIT.shortText),
  excerpt: z.string().max(LIMIT.mediumText).optional(),
  body: z.string().max(LIMIT.longText).optional(),
  coverImage: z.string().max(LIMIT.url).optional(),
  published: z.boolean(),
  publishedAt: z.string().max(LIMIT.isoDate).optional(),
  tags: z.array(z.string().max(50)).max(LIMIT.articleTags).optional(),
});

export const knowledgeSchema = z.object({
  articles: z.array(knowledgeArticleSchema).max(LIMIT.articles),
});

export const verificationDocumentSchema = z.object({
  id: z.string().min(1).max(LIMIT.id),
  type: z.enum([
    'national_id',
    'business_license',
    'real_estate_license',
    'union_membership',
    'certificate',
    'tax_certificate',
    'other',
  ]),
  title: z.string().trim().min(1).max(LIMIT.shortText),
  fileUrl: z.string().max(LIMIT.url),
  status: z.enum(['pending', 'approved', 'rejected']),
  uploadedAt: z.string().max(LIMIT.isoDate),
  reviewedAt: z.string().max(LIMIT.isoDate).optional(),
  reviewerNote: z.string().max(LIMIT.mediumText).optional(),
});

export const verificationDocumentsSchema = z.array(verificationDocumentSchema).max(LIMIT.documents);

/** Owner PATCH payload — unknown keys rejected. */
export const ecosystemOwnerPatchSchema = z
  .object({
    specializations: specializationsSchema.optional(),
    serviceArea: serviceAreaSchema.optional(),
    network: networkSchema.optional(),
    knowledge: knowledgeSchema.optional(),
    verificationDocuments: verificationDocumentsSchema.optional(),
  })
  .strict();

export type EcosystemOwnerPatch = z.infer<typeof ecosystemOwnerPatchSchema>;
