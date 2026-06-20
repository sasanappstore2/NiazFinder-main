import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requirePermission } from '@/lib/rbac/authz';
import {
  getTrainingExampleById,
  updateTrainingExample,
} from '@/intake/training/trainingRepository';

export const runtime = 'nodejs';

const patchSchema = z.object({
  reviewed: z.boolean().optional(),
  qualityScore: z.number().min(0).max(1).nullable().optional(),
  moderationLabel: z.string().nullable().optional(),
  correctedEntities: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:read');
    if (!authz.ok) return authz.response;

    const { id } = await context.params;
    const row = await getTrainingExampleById(id);
    if (!row) {
      return NextResponse.json({ error: 'نمونه یافت نشد' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    console.error('intake-training get error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'ops:intake-training:write');
    if (!authz.ok) return authz.response;

    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());

    const existing = await getTrainingExampleById(id);
    if (!existing) {
      return NextResponse.json({ error: 'نمونه یافت نشد' }, { status: 404 });
    }

    const userId = authz.user.id;
    const reviewed = body.reviewed;
    const updated = await updateTrainingExample(id, {
      reviewed: body.reviewed,
      qualityScore: body.qualityScore,
      moderationLabel: body.moderationLabel,
      correctedEntities: body.correctedEntities as Prisma.InputJsonValue | undefined,
      reviewedBy: reviewed === true ? userId : reviewed === false ? null : undefined,
      reviewedAt: reviewed === true ? new Date() : reviewed === false ? null : undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
    }
    console.error('intake-training patch error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
