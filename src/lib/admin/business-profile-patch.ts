import { toJson } from '@/lib/business/json-fields';
import type { BusinessStatus, Prisma } from '@prisma/client';

const MAX_NAME = 120;
const MAX_SLUG = 80;
const MAX_TEXT = 5000;

function trimStr(value: unknown, max: number): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function parseJsonStringArray(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return toJson(value.map((v) => String(v).trim()).filter(Boolean));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return toJson(parsed.map((v) => String(v).trim()).filter(Boolean));
      }
    } catch {
      return toJson(
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }
  }
  return undefined;
}

export type BusinessProfilePatchResult =
  | { ok: true; data: Prisma.BusinessProfileUpdateInput; slugChanged: boolean }
  | { ok: false; error: string };

export function buildBusinessProfilePatch(
  body: Record<string, unknown>,
  existingSlug: string
): BusinessProfilePatchResult {
  const data: Prisma.BusinessProfileUpdateInput = {};
  let slugChanged = false;

  const name = trimStr(body.name, MAX_NAME);
  if (name !== undefined) data.name = name;

  const description = trimStr(body.description, MAX_TEXT);
  if (description !== undefined) data.description = description || null;

  for (const key of ['city', 'province', 'address'] as const) {
    const v = trimStr(body[key], 200);
    if (v !== undefined) data[key] = v || null;
  }

  for (const key of ['phone', 'whatsapp'] as const) {
    const v = trimStr(body[key], 32);
    if (v !== undefined) data[key] = v || null;
  }

  const email = trimStr(body.email, 120);
  if (email !== undefined) data.email = email || null;

  const slug = trimStr(body.slug, MAX_SLUG);
  if (slug !== undefined) {
    if (!slug) return { ok: false, error: 'slug نمی‌تواند خالی باشد' };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { ok: false, error: 'فرمت slug نامعتبر است' };
    }
    data.slug = slug;
    slugChanged = slug !== existingSlug;
  }

  if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
    data.status = body.status as BusinessStatus;
  }
  if (typeof body.verified === 'boolean') data.verified = body.verified;
  if (typeof body.leadAlertsEnabled === 'boolean') data.leadAlertsEnabled = body.leadAlertsEnabled;
  if (typeof body.chatEnabled === 'boolean') data.chatEnabled = body.chatEnabled;

  const categorySlugs = parseJsonStringArray(body.categorySlugs);
  if (categorySlugs !== undefined) data.categorySlugs = categorySlugs;

  const tags = parseJsonStringArray(body.tags);
  if (tags !== undefined) data.tags = tags;

  if (Object.keys(data).length === 0) {
    return { ok: false, error: 'فیلدی برای به‌روزرسانی ارسال نشده' };
  }

  return { ok: true, data, slugChanged };
}
