import { db } from '@/lib/db';
import type { BusinessProfile } from '@prisma/client';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import { createStorefrontCategoryId, parseStorefrontExtension } from '@/lib/business/storefront';
import {
  buildOfferFeaturesFromBody,
} from '@/lib/business/serialize-offer-payload';
import { serializeOfferStorefrontFeatures } from '@/lib/business/offer-storefront-meta';
import { normalizeWebPresence } from '@/lib/business/normalize-web-presence';
import type { SiteImportApplyResult, SiteImportSuggestion } from './types';
import { importRemoteImage } from './import-remote-image';
import { sortAcceptedSuggestions } from './suggestion-queue';

const CTA_REVERSE: Record<string, string> = {
  book: 'BOOK',
  quote: 'QUOTE',
  call: 'CALL',
  chat: 'CHAT',
};

type OfferInput = {
  title: string;
  description: string;
  priceRange?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string;
  ctaType?: string;
  categoryTitle?: string | null;
};

export async function applySiteImportSuggestions(
  profile: BusinessProfile,
  suggestions: SiteImportSuggestion[],
  acceptedIds: string[]
): Promise<SiteImportApplyResult> {
  const toApply = sortAcceptedSuggestions(suggestions, acceptedIds);

  const accepted = new Set(acceptedIds);
  const result: SiteImportApplyResult = {
    applied: [],
    skipped: suggestions.filter((s) => !accepted.has(s.id)).map((s) => s.id),
    errors: [],
  };

  let categoryIdsByTitle = new Map<string, string>();
  let defaultCategoryId: string | null = null;

  for (const suggestion of toApply) {
    try {
      switch (suggestion.apply.type) {
        case 'patch_profile': {
          const payload = suggestion.apply.payload;
          const data: Record<string, unknown> = {};
          for (const key of [
            'name',
            'description',
            'logo',
            'coverImage',
            'phone',
            'email',
            'seoTitle',
            'seoDescription',
          ] as const) {
            if (typeof payload[key] === 'string' && payload[key]) {
              if (key === 'logo' || key === 'coverImage') {
                const local =
                  payload[key].startsWith('http')
                    ? await importRemoteImage(
                        payload[key],
                        profile.id,
                        key === 'logo' ? 'logo' : 'cover'
                      )
                    : payload[key];
                if (local) data[key] = local;
              } else {
                data[key] = payload[key];
              }
            }
          }
          if (Object.keys(data).length > 0) {
            await db.businessProfile.update({
              where: { id: profile.id },
              data,
            });
            result.applied.push(suggestion.id);
          }
          break;
        }
        case 'patch_web_presence': {
          const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
          const currentWp = extensions.webPresence;
          const current =
            currentWp && typeof currentWp === 'object'
              ? (currentWp as Record<string, string>)
              : {};
          const normalized = normalizeWebPresence({
            website: String(current.website ?? ''),
            instagram: String(current.instagram ?? ''),
            telegram: String(current.telegram ?? ''),
            bale: String(current.bale ?? ''),
            rubika: String(current.rubika ?? ''),
            eitaa: String(current.eitaa ?? ''),
            ...Object.fromEntries(
              Object.entries(suggestion.apply.payload).map(([k, v]) => [k, String(v ?? '')])
            ),
          });
          await db.businessProfile.update({
            where: { id: profile.id },
            data: {
              extensions: toJson({
                ...extensions,
                webPresence: normalized,
              }),
            },
          });
          profile = await db.businessProfile.findUniqueOrThrow({ where: { id: profile.id } });
          result.applied.push(suggestion.id);
          break;
        }
        case 'add_categories': {
          const titles = (suggestion.apply.payload.titles as string[]) ?? [];
          const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
          const storefront = parseStorefrontExtension(extensions.storefront);
          const existingTitles = new Set(storefront.categories.map((c) => c.title));
          const next = [...storefront.categories];
          for (const title of titles) {
            const t = title.trim();
            if (!t || existingTitles.has(t)) continue;
            const id = createStorefrontCategoryId();
            next.push({ id, title: t, sortOrder: next.length });
            categoryIdsByTitle.set(t, id);
            existingTitles.add(t);
          }
          if (next.length > storefront.categories.length) {
            defaultCategoryId = next[next.length - 1]?.id ?? defaultCategoryId;
            await db.businessProfile.update({
              where: { id: profile.id },
              data: {
                extensions: toJson({
                  ...extensions,
                  storefront: { ...storefront, categories: next },
                }),
              },
            });
            profile = await db.businessProfile.findUniqueOrThrow({ where: { id: profile.id } });
            result.applied.push(suggestion.id);
          }
          break;
        }
        case 'add_offers': {
          const offers = (suggestion.apply.payload.offers as OfferInput[]) ?? [];
          const count = await db.businessOffer.count({ where: { profileId: profile.id } });
          let order = count;
          let created = 0;

          if (categoryIdsByTitle.size === 0) {
            const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
            const storefront = parseStorefrontExtension(extensions.storefront);
            for (const c of storefront.categories) {
              categoryIdsByTitle.set(c.title, c.id);
            }
            defaultCategoryId = storefront.categories[0]?.id ?? null;
          }

          const existingOffers = await db.businessOffer.findMany({
            where: { profileId: profile.id },
            select: { title: true },
          });
          const existingTitles = new Set(
            existingOffers.map((o) => o.title.trim().toLowerCase())
          );

          for (const offer of offers) {
            const title = offer.title?.trim();
            const description = offer.description?.trim() || title;
            if (!title) continue;
            if (existingTitles.has(title.toLowerCase())) continue;

            const images: string[] = [];
            if (offer.imageUrl?.trim()) {
              const local = await importRemoteImage(offer.imageUrl, profile.id, 'product');
              if (local) images.push(local);
            }

            const categoryTitle = offer.categoryTitle?.trim();
            const categoryId =
              (categoryTitle && categoryIdsByTitle.get(categoryTitle)) ||
              defaultCategoryId;

            const body = {
              title,
              description,
              priceRange: offer.priceRange ?? null,
              images,
              categoryIds: categoryId ? [categoryId] : [],
              primaryCategoryId: categoryId,
              ctaType: offer.ctaType ?? 'chat',
            };

            const features =
              buildOfferFeaturesFromBody('[]', body) ??
              serializeOfferStorefrontFeatures([], {
                categoryIds: body.categoryIds,
                primaryCategoryId: body.primaryCategoryId,
                variants: [],
                brandId: null,
              });

            await db.businessOffer.create({
              data: {
                profileId: profile.id,
                title,
                description,
                priceRange: body.priceRange,
                images: toJson(images),
                features: toJson(features),
                faq: toJson([]),
                ctaType: (CTA_REVERSE[body.ctaType] ?? 'CHAT') as 'CHAT',
                order,
              },
            });
            existingTitles.add(title.toLowerCase());
            order += 1;
            created += 1;
          }

          if (created > 0) {
            result.applied.push(suggestion.id);
          } else {
            result.errors.push({
              id: suggestion.id,
              message: 'محصولی برای افزودن یافت نشد (تکراری یا نامعتبر)',
            });
          }
          break;
        }
        case 'patch_extensions':
          break;
        default:
          result.errors.push({ id: suggestion.id, message: 'نوع پیشنهاد پشتیبانی نمی‌شود' });
      }
    } catch (e) {
      result.errors.push({
        id: suggestion.id,
        message: e instanceof Error ? e.message : 'خطا در اعمال',
      });
    }
  }

  return result;
}
