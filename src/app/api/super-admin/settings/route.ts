import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { readAdminSettings, writeAdminSettings, type AdminSettings } from '@/lib/admin/settings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:settings:write');
    if (!authz.ok) return authz.response;

    const settings = await readAdminSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Super admin settings GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:settings:write');
    if (!authz.ok) return authz.response;

    const body = await request.json().catch(() => ({}));
    const current = await readAdminSettings();

    const next: AdminSettings = {
      chatEnabled:
        typeof body.chatEnabled === 'boolean' ? body.chatEnabled : current.chatEnabled,
      voiceEnabled:
        typeof body.voiceEnabled === 'boolean' ? body.voiceEnabled : current.voiceEnabled,
      maintenanceMode:
        typeof body.maintenanceMode === 'boolean'
          ? body.maintenanceMode
          : current.maintenanceMode,
    };

    const settings = await writeAdminSettings(next);

    await logAdminAction(request, authz.user.id, 'ops.settings.update', 'AdminSettings', null, {
      settings,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Super admin settings PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
