import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** @deprecated Use POST /api/intake/analyze — removed in site cohesion phase 10. */
export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json(
    {
      error: 'این API منسوخ شده است. از POST /api/intake/analyze استفاده کنید.',
      replacement: '/api/intake/analyze',
    },
    { status: 410 }
  );
}
