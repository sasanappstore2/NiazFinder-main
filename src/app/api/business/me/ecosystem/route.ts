import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { mergeEcosystemIntoExtensions } from '@/lib/business/ecosystem';
import { ecosystemOwnerPatchSchema } from '@/lib/business/ecosystem/validation';
import type { EcosystemExtension, VerificationDocument } from '@/lib/business/ecosystem';
import { queueBusinessProfileTypesenseSync } from '@/lib/search/typesense-sync';

export const runtime = 'nodejs';

function readEcosystem(extensions: string): EcosystemExtension {
  try {
    return (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
  } catch {
    return {};
  }
}

function sanitizeOwnerVerificationDocuments(
  incoming: VerificationDocument[],
  current: VerificationDocument[]
): VerificationDocument[] {
  const byId = new Map(current.map((d) => [d.id, d]));
  return incoming.map((doc) => {
    const prev = byId.get(doc.id);
    if (prev && prev.status === 'approved' && prev.fileUrl === doc.fileUrl) {
      return {
        ...doc,
        status: prev.status,
        reviewedAt: prev.reviewedAt,
        reviewerNote: prev.reviewerNote,
      };
    }
    return {
      ...doc,
      status: 'pending' as const,
      reviewedAt: undefined,
      reviewerNote: undefined,
    };
  });
}

/** GET — current ecosystem blob for the owner's profile. */
export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;
  const profile = await loadMyBusinessProfile(access.user);
  return NextResponse.json({ ecosystem: readEcosystem(profile.extensions) });
}

/**
 * PATCH — owner-editable ecosystem fields: specializations, service area,
 * network connections/referrals, knowledge articles, and verification documents.
 * Verification *level* is admin-only; owners may only submit documents.
 *
 * All input is validated with Zod (H2): unknown keys, oversized arrays, and
 * malformed records are rejected with HTTP 400.
 */
export async function PATCH(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;
  const profile = await loadMyBusinessProfile(access.user);

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: 'بدنه نامعتبر است' }, { status: 400 });
  }

  const parsed = ecosystemOwnerPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'داده‌های ارسالی نامعتبر است', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const patch: Partial<EcosystemExtension> = {};
  if (body.specializations !== undefined) patch.specializations = body.specializations;
  if (body.serviceArea !== undefined) patch.serviceArea = body.serviceArea;
  if (body.network !== undefined) patch.network = body.network;
  if (body.knowledge !== undefined) patch.knowledge = body.knowledge;

  if (body.verificationDocuments !== undefined) {
    const current = readEcosystem(profile.extensions);
    const documents = sanitizeOwnerVerificationDocuments(
      body.verificationDocuments,
      current.verification?.documents ?? []
    );
    patch.verification = {
      level: current.verification?.level ?? 'basic',
      documents,
      manualBadges: current.verification?.manualBadges,
    };
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'تغییری ارسال نشد' }, { status: 400 });
  }

  const merged = mergeEcosystemIntoExtensions(profile.extensions, patch);
  await db.businessProfile.update({
    where: { id: profile.id },
    data: { extensions: JSON.stringify(merged) },
  });

  queueBusinessProfileTypesenseSync(profile.id);

  return NextResponse.json({ ok: true, ecosystem: merged.ecosystem });
}
