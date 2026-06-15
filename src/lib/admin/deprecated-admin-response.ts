import { NextResponse } from 'next/server';

/** Legacy /api/admin/* — prefer /api/super-admin/* */
export function deprecatedAdminJson<T extends Record<string, unknown>>(body: T, status = 200) {
  return NextResponse.json(
    { ...body, _deprecated: 'Use /api/super-admin/* instead of /api/admin/*' },
    {
      status,
      headers: {
        Deprecation: 'true',
        Link: '</api/super-admin/users>; rel="successor-version"',
      },
    }
  );
}
