import { z } from 'zod';

const LIMIT = {
  listings: 100,
  id: 64,
  title: 200,
  shortText: 100,
  url: 2000,
} as const;

export const propertyListingSchema = z.object({
  id: z.string().trim().min(1).max(LIMIT.id),
  title: z.string().trim().min(1).max(LIMIT.title),
  price: z.string().trim().max(LIMIT.shortText).optional(),
  area: z.string().trim().max(LIMIT.shortText).optional(),
  rooms: z.number().int().min(0).max(50).optional(),
  image: z.string().trim().max(LIMIT.url).optional(),
  location: z.string().trim().max(LIMIT.shortText).optional(),
  status: z.enum(['active', 'sold', 'rented']).optional(),
  dealType: z.enum(['sale', 'rent']).optional(),
});

export const realEstateListingsPatchSchema = z
  .object({
    listings: z.array(propertyListingSchema).max(LIMIT.listings),
  })
  .strict();

export type ValidatedPropertyListing = z.infer<typeof propertyListingSchema>;
