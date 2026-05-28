import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/rbac/authz';
import { reviewTrainingExample } from '@/intake/training/dashboardData';

export const runtime = 'nodejs';

const patchSchema = z.object({
  action: z.enum(['mark_correct', 'correct_entities']),
  correctedEntities: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:write');
    if (!authz.ok) return authz.response;

    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const updated = await reviewTrainingExample({
      id,
      reviewedBy: authz.user.id,
      markCorrect: parsed.data.action === 'mark_correct',
      correctedEntities: parsed.data.correctedEntities,
    });

    return NextResponse.json({ ok: true, example: updated });
  } catch (error) {
    console.error('intake-training review error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
