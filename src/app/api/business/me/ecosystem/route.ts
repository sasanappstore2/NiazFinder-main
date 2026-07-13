import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import {
  mergeEcosystemIntoExtensions,
} from '@/lib/business/ecosystem/accessor';
import type { EcosystemExtension } from '@/lib/business/ecosystem/types';

export const runtime = 'nodejs';

const serviceAreaEntrySchema = z.object({
  city: z.string().min(1),
  cityId: z.string().optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  neighborhoodId: z.string().optional(),
  strength: z.number().min(1).max(5).optional(),
});

const filingPreferencesSchema = z.object({
  dealTypes: z
    .array(
      z.enum(['sell', 'rent_rahn_ejare', 'rent_rahn_full', 'rent_short_term'])
    )
    .optional(),
  propertyKinds: z
    .array(z.enum(['apartment', 'villa', 'land', 'office', 'shop', 'commercial']))
    .optional(),
});

const serviceAreaPatchSchema = z.object({
  areas: z.array(serviceAreaEntrySchema).optional(),
  filingPreferences: filingPreferencesSchema.optional(),
});

const followUpStageSchema = z.enum([
  'new',
  'contacted',
  'visited',
  'negotiating',
  'closed',
]);

const followUpRecordSchema = z.object({
  id: z.string().min(1),
  stage: followUpStageSchema,
  subject: z.string(),
  note: z.string(),
  customer: z.string().nullable().optional(),
  property: z.string().nullable().optional(),
  requestId: z.string(),
  needUrl: z.string(),
  sourceKind: z.enum(['need', 'collaboration']).optional(),
  nextActionDate: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
  stageNotes: z
    .array(
      z.object({
        id: z.string(),
        stage: followUpStageSchema,
        text: z.string(),
        createdAt: z.string(),
      })
    )
    .optional(),
  reminder: z
    .object({
      id: z.string(),
      stage: followUpStageSchema,
      label: z.string(),
      dueAt: z.string(),
      firedAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  contactUserId: z.string().nullable().optional(),
  chatUrl: z.string().nullable().optional(),
  contactRequestId: z.string().nullable().optional(),
  authorSlug: z.string().nullable().optional(),
  hasPhone: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
});

const ecosystemPatchSchema = z
  .object({
    serviceArea: serviceAreaPatchSchema.optional(),
    workspaceFollowUps: z.array(followUpRecordSchema).optional(),
    specializations: z
      .array(
        z.enum([
          'luxury',
          'commercial',
          'office',
          'industrial',
          'land',
          'villa',
          'apartment',
          'investment',
        ])
      )
      .optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const ecosystem = (extensions.ecosystem as EcosystemExtension) ?? {};

    return NextResponse.json({ ecosystem });
  } catch (error) {
    console.error('Business ecosystem GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const parsed = ecosystemPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'داده نامعتبر', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const profile = await ensureBusinessProfile(auth.user);
    const nextExtensions = mergeEcosystemIntoExtensions(
      profile.extensions,
      parsed.data as Partial<EcosystemExtension>
    );

    await db.businessProfile.update({
      where: { id: profile.id },
      data: { extensions: toJson(nextExtensions) },
    });

    const ecosystem = (nextExtensions.ecosystem as EcosystemExtension) ?? {};

    return NextResponse.json({ message: 'ذخیره شد', ecosystem });
  } catch (error) {
    console.error('Business ecosystem PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
