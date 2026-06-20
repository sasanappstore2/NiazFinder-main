import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/rbac/authz';
import { buildGoldDataset } from '@/intake/training/trainingDatasetBuilder';
import type { TrainingExportFormat } from '@/intake/training/types';

export const runtime = 'nodejs';

const exportBodySchema = z.object({
  format: z.enum(['mlx-jsonl', 'dataset-fixtures', 'raw-jsonl']).optional(),
  reviewedOnly: z.boolean().optional(),
  limit: z.number().int().positive().max(100_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:write');
    if (!authz.ok) return authz.response;

    const body = exportBodySchema.parse(await request.json().catch(() => ({})));
    const result = await buildGoldDataset({
      format: (body.format ?? 'mlx-jsonl') as TrainingExportFormat,
      reviewedOnly: body.reviewedOnly ?? true,
      limit: body.limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
    }
    console.error('intake-training export error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
