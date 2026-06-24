import { z } from 'zod';
import { normalizeIranMobile } from '@/lib/format/digits';
import { isPickableProfileCategorySlug } from '@/lib/business/business-category';
import {
  isAllowedBusinessMediaUrl,
  normalizeBaleUrl,
  normalizeEitaaUrl,
  normalizeInstagramUrl,
  normalizeRubikaUrl,
  normalizeTelegramUrl,
  normalizeWebsiteUrl,
} from '@/lib/business/normalize-web-presence';
import {
  serviceAreaEntrySchema,
  specializationsSchema,
} from '@/lib/business/ecosystem/validation';

const IRAN_MOBILE_ASCII = /^09[0-9]{9}$/;

function normalizeIranPhone(raw: string): string {
  return normalizeIranMobile(raw) ?? raw;
}

const optionalMediaUrl = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((v) => isAllowedBusinessMediaUrl(v), 'آدرس تصویر نامعتبر است');

const optionalWebsite = z
  .string()
  .trim()
  .optional()
  .default('')
  .transform(normalizeWebsiteUrl);

const optionalInstagram = z
  .string()
  .trim()
  .optional()
  .default('')
  .transform(normalizeInstagramUrl);

const optionalTelegram = z
  .string()
  .trim()
  .optional()
  .default('')
  .transform(normalizeTelegramUrl);

const optionalBale = z.string().trim().optional().default('').transform(normalizeBaleUrl);

const optionalRubika = z.string().trim().optional().default('').transform(normalizeRubikaUrl);

const optionalEitaa = z.string().trim().optional().default('').transform(normalizeEitaaUrl);

export const businessOnboardingStep1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'نام نمایشی باید حداقل ۲ کاراکتر باشد')
    .max(120),
  occupationSlugs: z
    .array(z.string().refine(isPickableProfileCategorySlug, 'دسته نامعتبر است'))
    .min(1, 'حداقل یک شغل یا حوزه فروشگاه اینترنتی انتخاب کنید')
    .max(3, 'حداکثر ۳ مورد می‌توانید انتخاب کنید'),
  description: z.string().trim().max(500).optional().default(''),
});

export const businessOnboardingStep2Schema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'شماره تماس الزامی است')
    .transform(normalizeIranPhone)
    .refine((p) => IRAN_MOBILE_ASCII.test(p), 'شماره موبایل معتبر وارد کنید'),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizeIranPhone(v) : ''))
    .refine((p) => !p || IRAN_MOBILE_ASCII.test(p), 'شماره واتساپ معتبر نیست'),
  email: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((v) => !v || z.string().email().safeParse(v).success, 'ایمیل معتبر نیست'),
  city: z.string().trim().max(80).optional().default(''),
  province: z.string().trim().max(80).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
});

export const businessOnboardingStep3Schema = z.object({
  logo: optionalMediaUrl,
  coverImage: optionalMediaUrl,
  website: optionalWebsite,
  instagram: optionalInstagram,
  telegram: optionalTelegram,
  bale: optionalBale,
  rubika: optionalRubika,
  eitaa: optionalEitaa,
});

export const realEstateDetailsSchema = z.object({
  serviceAreas: z.array(serviceAreaEntrySchema).max(12).optional().default([]),
  specializations: specializationsSchema.optional().default([]),
  designStyles: z.array(z.string().trim().max(50)).max(12).optional().default([]),
});

export type RealEstateOnboardingDetails = z.infer<typeof realEstateDetailsSchema>;

export const EMPTY_REAL_ESTATE_ONBOARDING_DETAILS: RealEstateOnboardingDetails = {
  serviceAreas: [],
  specializations: [],
  designStyles: [],
};

export const businessOnboardingRealEstateStepSchema = z.object({
  realEstateDetails: realEstateDetailsSchema.optional().default(EMPTY_REAL_ESTATE_ONBOARDING_DETAILS),
});

export const businessOnboardingPayloadSchema = businessOnboardingStep1Schema
  .merge(businessOnboardingStep2Schema)
  .merge(businessOnboardingStep3Schema)
  .merge(businessOnboardingRealEstateStepSchema)
  .transform((d) => ({
    ...d,
    primaryCategorySlug: d.occupationSlugs[0],
  }));

export type BusinessOnboardingPayload = z.infer<typeof businessOnboardingPayloadSchema>;

const businessOnboardingPayloadBaseSchema = businessOnboardingStep1Schema
  .merge(businessOnboardingStep2Schema)
  .merge(businessOnboardingStep3Schema)
  .merge(businessOnboardingRealEstateStepSchema)
  .extend({
    primaryCategorySlug: z.string().optional(),
  });

export const businessOnboardingDraftSchema = z
  .object({
    step: z.number().int().min(0).max(3).optional(),
  })
  .merge(businessOnboardingPayloadBaseSchema.partial());
