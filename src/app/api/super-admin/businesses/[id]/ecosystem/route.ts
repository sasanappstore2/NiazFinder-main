import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  mergeEcosystemIntoExtensions,
  VERIFICATION_LEVELS,
  levelForScore,
} from '@/lib/business/ecosystem';
import type { EcosystemExtension, VerificationLevel } from '@/lib/business/ecosystem';

export const runtime = 'nodejs';

function readEcosystem(extensions: string): EcosystemExtension {
  try {
    return (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
  } catch {
    return {};
  }
}

/**
 * Phase 10 — Super Admin manages verification level, trust badges, reputation
 * override and document approvals for a business.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const profile = await db.businessProfile.findUnique({
      where: { id },
      select: { id: true, extensions: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const current = readEcosystem(profile.extensions);
    const patch: Partial<EcosystemExtension> = {};

    if (typeof body.verificationLevel === 'string' && VERIFICATION_LEVELS.includes(body.verificationLevel)) {
      patch.verification = {
        level: body.verificationLevel as VerificationLevel,
        documents: Array.isArray(body.documents) ? body.documents : current.verification?.documents ?? [],
        manualBadges: Array.isArray(body.manualBadges)
          ? body.manualBadges
          : current.verification?.manualBadges,
      };
    } else if (body.documents !== undefined || body.manualBadges !== undefined) {
      patch.verification = {
        level: current.verification?.level ?? 'basic',
        documents: Array.isArray(body.documents) ? body.documents : current.verification?.documents ?? [],
        manualBadges: Array.isArray(body.manualBadges)
          ? body.manualBadges
          : current.verification?.manualBadges,
      };
    }

    if (body.reputationScore !== undefined) {
      const score = Math.max(0, Math.min(100, Number(body.reputationScore) || 0));
      patch.reputation = {
        score,
        level: levelForScore(score),
        computedAt: new Date().toISOString(),
      };
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'تغییری ارسال نشد' }, { status: 400 });
    }

    const merged = mergeEcosystemIntoExtensions(profile.extensions, patch);
    await db.businessProfile.update({
      where: { id },
      data: { extensions: JSON.stringify(merged) },
    });

    await logAdminAction(request, authz.user.id, 'business.ecosystem.update', 'BusinessProfile', id, patch);

    return NextResponse.json({ ok: true, ecosystem: merged.ecosystem });
  } catch (error) {
    console.error('super-admin ecosystem PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
