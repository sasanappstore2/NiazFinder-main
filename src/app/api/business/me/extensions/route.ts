import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import type { BusinessExtension } from '@/contracts/business-profile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const { _layout, ...rest } = extensions;

    return NextResponse.json({ extensions: rest });
  } catch (error) {
    console.error('Business extensions GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const body = await request.json().catch(() => ({}));
    const patch = body.extensions as Partial<Omit<BusinessExtension, '_layout'>> | undefined;
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 });
    }

    const profile = await ensureBusinessProfile(user);
    const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
    const { _layout, ...rest } = extensions;

    const nextExtensions = {
      ...rest,
      ...patch,
      _layout,
    };

    await db.businessProfile.update({
      where: { id: profile.id },
      data: { extensions: toJson(nextExtensions) },
    });

    return NextResponse.json({ message: 'ذخیره شد' });
  } catch (error) {
    console.error('Business extensions PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
