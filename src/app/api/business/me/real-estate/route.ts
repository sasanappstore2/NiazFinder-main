import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import type { PropertyListing, RealEstateExtension } from '@/contracts/business-profile';
import { realEstateListingsPatchSchema } from '@/lib/business/real-estate-listings-validation';
import { queueBusinessProfileTypesenseSync } from '@/lib/search/typesense-sync';

export const runtime = 'nodejs';

function readListings(extensions: string): PropertyListing[] {
  const parsed = parseJsonObject<Record<string, unknown>>(extensions, {});
  const re = parsed.realEstate as RealEstateExtension | undefined;
  return Array.isArray(re?.listings) ? re.listings : [];
}

/** GET — property listings for the owner's profile. */
export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  return NextResponse.json({ listings: readListings(profile.extensions) });
}

/** PATCH — replace property listings (validated, max 100). */
export async function PATCH(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: 'بدنه نامعتبر است' }, { status: 400 });
  }

  const parsed = realEstateListingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'داده‌های آگهی نامعتبر است', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const profile = await loadMyBusinessProfile(access.user);
  const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
  const nextExtensions = {
    ...extensions,
    realEstate: {
      ...(typeof extensions.realEstate === 'object' && extensions.realEstate !== null
        ? (extensions.realEstate as Record<string, unknown>)
        : {}),
      listings: parsed.data.listings,
    },
  };

  await db.businessProfile.update({
    where: { id: profile.id },
    data: { extensions: toJson(nextExtensions) },
  });

  queueBusinessProfileTypesenseSync(profile.id);

  return NextResponse.json({ ok: true, listings: parsed.data.listings });
}
