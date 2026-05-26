import { z } from 'zod';

/** Payload stored in Message.content when type = NEED_CARD */
export const needCardSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  budgetType: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  address: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  categoryIcon: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  viewCount: z.number().optional(),
  proposalCount: z.number().optional(),
  createdAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  matchReasonFa: z.string().optional(),
});

export type NeedCardSnapshot = z.infer<typeof needCardSnapshotSchema>;

export function parseNeedCardSnapshot(content: string): NeedCardSnapshot | null {
  try {
    const parsed = JSON.parse(content);
    const result = needCardSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
