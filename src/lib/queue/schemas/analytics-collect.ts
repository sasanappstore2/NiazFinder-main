import { z } from 'zod';

export const analyticsCollectSchema = z.object({
  sessionId: z.string().min(1),
  visitorId: z.string().min(1),
  type: z.enum(['page_view', 'event']),
  path: z.string().min(1).max(2048),
  title: z.string().optional(),
  referrer: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional(),
    })
    .optional(),
  userId: z.string().optional(),
  consent: z.boolean().optional(),
  userLocation: z
    .object({
      province: z.string().optional(),
      city: z.string().optional(),
      citySlug: z.string().optional(),
    })
    .optional(),
  selectedCitySlug: z.string().optional(),
});

export type AnalyticsCollectBody = z.infer<typeof analyticsCollectSchema>;

/** Enriched payload queued for the analytics worker (includes server-side enrichment). */
export const analyticsTelemetryMessageSchema = analyticsCollectSchema.extend({
  device: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  os: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  eventProperties: z.record(z.string(), z.unknown()).optional(),
  enrichedAt: z.string().optional(),
});

export type AnalyticsTelemetryMessage = z.infer<typeof analyticsTelemetryMessageSchema>;
