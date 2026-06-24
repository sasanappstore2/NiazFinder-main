import { z } from 'zod';

/** Owner-safe extensions patch — blocks ecosystem/realEstate bypass. */
export const extensionsOwnerPatchSchema = z
  .object({
    webPresence: z
      .object({
        website: z.string().max(500).optional(),
        instagram: z.string().max(200).optional(),
        telegram: z.string().max(200).optional(),
        bale: z.string().max(200).optional(),
        rubika: z.string().max(200).optional(),
        eitaa: z.string().max(200).optional(),
      })
      .strict()
      .optional(),
    restaurant: z.record(z.string(), z.unknown()).optional(),
    storefront: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ExtensionsOwnerPatch = z.infer<typeof extensionsOwnerPatchSchema>;
