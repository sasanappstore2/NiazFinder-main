import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import { requirePermission } from '@/lib/rbac/authz';
import { db } from '@/lib/db';
import {
  buildAdminPreviewWorkspaceData,
  loadWorkspaceDataForUser,
} from '@/lib/business/workspace/load-workspace-data';

export const runtime = 'nodejs';

function parseOccupationSlugs(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

/** GET — unified workspace board data (needs, files, collaborations, follow-ups). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPreview = searchParams.get('adminPreview') === '1';

    if (adminPreview) {
      const authz = await requirePermission(request, 'market:filings:read');
      if (!authz.ok) return authz.response;
      return NextResponse.json({
        ...buildAdminPreviewWorkspaceData(),
        adminPreview: true,
      });
    }

    const access = await requireBusinessAccess(request);
    if ('error' in access) return access.error;

    const user = access.user;
    const profile = await db.businessProfile.findUnique({
      where: { userId: user.id },
      select: { categorySlugs: true },
    });

    const occupationSlugs = profile ? parseOccupationSlugs(profile.categorySlugs) : [];
    if (!isRealEstateBusiness(occupationSlugs)) {
      return NextResponse.json(
        { error: 'میزکار املاک فقط برای کسب‌وکارهای حوزه املاک فعال است' },
        { status: 403 }
      );
    }

    const data = await loadWorkspaceDataForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('workspace GET error:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری میزکار' }, { status: 500 });
  }
}
