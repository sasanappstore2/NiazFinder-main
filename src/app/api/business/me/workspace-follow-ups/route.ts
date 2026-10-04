import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import {
  readWorkspaceFollowUpsFromExtensions,
  writeWorkspaceFollowUpsToExtensions,
} from '@/lib/business/workspace/follow-up-persistence';

export const runtime = 'nodejs';

const patchSchema = z.object({
  followUps: z.array(z.record(z.string(), z.unknown())).max(200),
});

/** GET — persisted workspace follow-ups from business profile extensions. */
export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const followUps = readWorkspaceFollowUpsFromExtensions(profile.extensions);

  return NextResponse.json({ followUps });
}

/** PATCH — replace workspace follow-ups blob (synced from client kanban). */
export async function PATCH(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 });
  }

  const profile = await loadMyBusinessProfile(access.user);
  const nextExtensions = writeWorkspaceFollowUpsToExtensions(
    profile.extensions,
    parsed.data.followUps as never
  );

  await db.businessProfile.update({
    where: { id: profile.id },
    data: { extensions: nextExtensions },
  });

  return NextResponse.json({ ok: true, count: parsed.data.followUps.length });
}
