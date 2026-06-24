import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { countProfilesByOccupationSlug } from '@/lib/business/occupations-admin';
import { readManagedOccupations } from '@/lib/business/occupations-registry';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authz = await requirePermission(request, 'taxonomy:business-occupations:read');
    if (!authz.ok) return authz.response;

    const { slug } = await params;
    const occupations = await readManagedOccupations();
    const row = occupations.find((o) => o.slug === slug);
    if (!row) {
      return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    }

    const profiles = await db.businessProfile.findMany({ select: { categorySlugs: true } });
    const profileCounts = countProfilesByOccupationSlug(profiles);

    const childJobs =
      row.depth === 0 ? occupations.filter((o) => o.parentSlug === slug && o.depth === 1) : [];

    let profileCount = profileCounts.get(slug) ?? 0;
    let activeChildren = 0;

    if (row.depth === 0) {
      for (const job of childJobs) {
        profileCount += profileCounts.get(job.slug) ?? 0;
        if (job.isActive !== false) activeChildren += 1;
      }
    }

    return NextResponse.json({
      slug: row.slug,
      depth: row.depth,
      profileCount,
      activeChildren,
      totalChildren: childJobs.length,
    });
  } catch (error) {
    console.error('Super admin business-occupation impact GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
