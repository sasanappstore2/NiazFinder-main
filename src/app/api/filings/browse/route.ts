import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  browsePageFromSearchParams,
  filtersFromSearchParams,
} from '@/lib/filing/browse/browse-url';
import {
  filingBrowseDefaultCityId,
  filingBrowseDefaultCityName,
} from '@/lib/filing/browse/config';
import { queryFilingsForBrowse } from '@/lib/filing/browse/query-filings';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';

export const runtime = 'nodejs';

const limitSchema = z.coerce.number().int().min(1).max(100).default(48);

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const filters = filtersFromSearchParams(sp);
    const page = browsePageFromSearchParams(sp);
    const limit = limitSchema.parse(sp.get('limit') ?? 48);

    const citySlug = sp.get('city')?.trim() || 'mashhad';
    const cityName =
      citySlug === 'mashhad' ? filingBrowseDefaultCityName() : citySlug;
    const cityId = citySlug === 'mashhad' ? filingBrowseDefaultCityId() : citySlug;

    const neighborhoods = await loadCityNeighborhoods(cityId).catch(() => []);

    const result = await queryFilingsForBrowse(filters, {
      city: cityName,
      cityId,
      cityName,
      page,
      limit,
      neighborhoods,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('GET /api/filings/browse error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
