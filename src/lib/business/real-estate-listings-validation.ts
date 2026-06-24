import { z } from 'zod';

const LIMIT = {
  listings: 100,
  id: 64,
  title: 200,
  shortText: 100,
  description: 1200,
  url: 2000,
  images: 5,
} as const;

export const propertyListingSchema = z.object({
  id: z.string().trim().min(1).max(LIMIT.id),
  title: z.string().trim().min(1).max(LIMIT.title),
  price: z.string().trim().max(LIMIT.shortText).optional(),
  area: z.string().trim().max(LIMIT.shortText).optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  image: z.string().trim().max(LIMIT.url).optional(),
  images: z.array(z.string().trim().max(LIMIT.url)).max(LIMIT.images).optional(),
  deposit: z.string().trim().max(LIMIT.shortText).optional(),
  monthlyRent: z.string().trim().max(LIMIT.shortText).optional(),
  floor: z.number().int().min(-2).max(200).optional(),
  deedType: z.string().trim().max(40).optional(),
  pricePerMeter: z.string().trim().max(LIMIT.shortText).optional(),
  plotWidth: z.string().trim().max(LIMIT.shortText).optional(),
  location: z.string().trim().max(LIMIT.shortText).optional(),
  description: z.string().trim().max(LIMIT.description).optional(),
  categorySlug: z.string().trim().max(64).optional(),
  neighborhoodId: z.string().trim().max(64).optional(),
  cityId: z.string().trim().max(64).optional(),
  propertyType: z.string().trim().max(40).optional(),
  status: z.enum(['active', 'sold', 'rented']).optional(),
  dealType: z
    .enum([
      'sell',
      'rent_rahn_ejare',
      'rent_rahn_full',
      'rent_short_term',
      'sale',
      'rent',
    ])
    .optional(),
});

export const realEstateListingsPatchSchema = z
  .object({
    listings: z.array(propertyListingSchema).max(LIMIT.listings),
  })
  .strict();

export type ValidatedPropertyListing = z.infer<typeof propertyListingSchema>;
