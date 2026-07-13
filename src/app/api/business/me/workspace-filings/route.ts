import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import type { EcosystemExtension } from '@/lib/business/ecosystem';
import {
  formatServiceAreaLabel,
  resolveRegionalFilingsFeedStatus,
} from '@/lib/filing/adapters/workspace-feed';
import { formatFilingPreferencesSummary } from '@/lib/business/workspace/filing-preferences';
import { buildWorkspaceFilingEntries } from '@/lib/filing/adapters/workspace-entries';

export const runtime = 'nodejs';

function readEcosystem(extensions: string): EcosystemExtension {
  try {
    return (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
  } catch {
    return {};
  }
}

/** GET — regional filing listings for workspace (filtered by owner service area). */
export async function GET(request: NextRequest) {
  try {
    const access = await requireBusinessAccess(request);
    if ('error' in access) return access.error;

    const profile = await loadMyBusinessProfile(access.user);
    const ecosystem = readEcosystem(profile.extensions);
    const areas = ecosystem.serviceArea?.areas ?? [];
    const filingPreferences = ecosystem.serviceArea?.filingPreferences;
    const regionLabel = formatServiceAreaLabel(areas);
    const regionalStatus = resolveRegionalFilingsFeedStatus(areas);

    const { entries, ownListingIds } = await buildWorkspaceFilingEntries({
      profileId: profile.id,
      profileSlug: profile.slug,
      extensions: profile.extensions,
      areas,
      filingPreferences,
    });
    const feedStatus = entries.length > 0 ? ('active' as const) : regionalStatus;

    return NextResponse.json({
      entries,
      ownListingIds,
      businessSlug: profile.slug,
      regionLabel,
      hasServiceArea: areas.length > 0,
      feedStatus,
      filingPreferencesSummary: formatFilingPreferencesSummary(filingPreferences),
    });
  } catch (error) {
    console.error('workspace-filings GET error:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری فایل‌ها' }, { status: 500 });
  }
}
