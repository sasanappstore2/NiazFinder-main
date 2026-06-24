import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { parseJsonArray, parseJsonObject, toJson } from '@/lib/business/json-fields';
import {
  getDefaultWidgetConfig,
  getWidgetsForSubtype,
  isRealEstateSubtype,
  type RealEstateSubtype,
  type WidgetConfig,
  type WidgetId,
} from '@/lib/business/widget-registry';
import { getPrimaryRealEstateSubtypeFromSlugs as resolveSubtype } from '@/lib/business/is-real-estate-business';

export const runtime = 'nodejs';

const widgetConfigEntrySchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(200),
});

const widgetsPatchSchema = z
  .object({
    widgets: z.array(widgetConfigEntrySchema).max(50),
  })
  .strict();

function readWidgetConfig(
  extensions: string,
  subtype: RealEstateSubtype
): WidgetConfig[] {
  const parsed = parseJsonObject<Record<string, unknown>>(extensions, {});
  const widgets = parsed.widgets as Record<string, WidgetConfig[]> | undefined;
  const custom = widgets?.[subtype];
  if (custom && Array.isArray(custom) && custom.length > 0) {
    return [...custom].sort((a, b) => a.order - b.order);
  }
  return getDefaultWidgetConfig(subtype);
}

function validateWidgetConfig(
  subtype: RealEstateSubtype,
  config: WidgetConfig[]
): WidgetConfig[] | null {
  const allowed = new Set(getWidgetsForSubtype(subtype).map((w) => w.id));
  const ids = new Set<string>();
  for (const entry of config) {
    if (!allowed.has(entry.id as WidgetId)) return null;
    if (ids.has(entry.id)) return null;
    ids.add(entry.id);
  }
  return [...config].sort((a, b) => a.order - b.order);
}

/** GET — widget config + titles for the owner's real-estate subtype. */
export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const slugs = parseJsonArray<string>(profile.categorySlugs);
  const subtype = resolveSubtype(slugs);

  if (!subtype) {
    return NextResponse.json({ error: 'پروفایل املاک نیست' }, { status: 400 });
  }

  const definitions = getWidgetsForSubtype(subtype).map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    defaultEnabled: w.defaultEnabled,
  }));

  return NextResponse.json({
    subtype,
    widgets: readWidgetConfig(profile.extensions, subtype),
    definitions,
  });
}

/** PATCH — save per-subtype widget visibility/order. */
export async function PATCH(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const slugs = parseJsonArray<string>(profile.categorySlugs);
  const subtype = resolveSubtype(slugs);

  if (!subtype || !isRealEstateSubtype(subtype)) {
    return NextResponse.json({ error: 'پروفایل املاک نیست' }, { status: 400 });
  }

  const raw = await request.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: 'بدنه نامعتبر است' }, { status: 400 });
  }

  const parsed = widgetsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'تنظیمات ویجت نامعتبر است', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const validated = validateWidgetConfig(subtype, parsed.data.widgets as WidgetConfig[]);
  if (!validated) {
    return NextResponse.json({ error: 'شناسه ویجت نامعتبر است' }, { status: 400 });
  }

  const extensions = parseJsonObject<Record<string, unknown>>(profile.extensions, {});
  const existingWidgets =
    typeof extensions.widgets === 'object' && extensions.widgets !== null
      ? (extensions.widgets as Record<string, WidgetConfig[]>)
      : {};

  const nextExtensions = {
    ...extensions,
    widgets: {
      ...existingWidgets,
      [subtype]: validated,
    },
  };

  await db.businessProfile.update({
    where: { id: profile.id },
    data: { extensions: toJson(nextExtensions) },
  });

  return NextResponse.json({ ok: true, widgets: validated });
}
