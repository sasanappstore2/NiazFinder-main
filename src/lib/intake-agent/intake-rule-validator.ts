import type { TechnicalConstraints, ValidateIntakeInput, ValidateIntakeResult } from '@/lib/intake-agent/types';
import { getCategoryRouteBySlug } from '@/lib/intake-agent/intake-vector-search';

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function coerceField(value: unknown, type?: string): unknown {
  if (value === null || value === undefined) return value;
  if (!type) return value;
  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : value;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      return ['true', '1', 'yes', 'بله'].includes(String(value).toLowerCase());
    case 'string':
      return String(value).trim();
    default:
      return value;
  }
}

export function validateAgainstConstraints(
  data: Record<string, unknown>,
  constraints: TechnicalConstraints,
): ValidateIntakeResult {
  const required = constraints.requiredFields ?? [];
  const optional = constraints.optionalFields ?? [];
  const fieldTypes = constraints.fieldTypes ?? {};
  const validators = constraints.validators ?? {};

  const normalized: Record<string, unknown> = {};
  const filledDefaults: Record<string, unknown> = {};
  const missing: string[] = [];
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of [...required, ...optional]) {
    const raw = data[field];
    if (isEmpty(raw)) continue;
    normalized[field] = coerceField(raw, fieldTypes[field]);
  }

  for (const field of required) {
    if (isEmpty(normalized[field]) && isEmpty(data[field])) {
      missing.push(field);
    }
  }

  for (const [field, allowed] of Object.entries(validators)) {
    const val = normalized[field] ?? data[field];
    if (isEmpty(val)) continue;
    const str = String(val).toLowerCase();
    if (!allowed.some((a) => a.toLowerCase() === str)) {
      errors.push({
        field,
        message: `Value must be one of: ${allowed.join(', ')}`,
      });
    }
  }

  if (constraints.set) {
    for (const [k, v] of Object.entries(constraints.set)) {
      if (isEmpty(normalized[k]) && isEmpty(data[k])) {
        normalized[k] = v;
        filledDefaults[k] = v;
      }
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
    normalized,
    filledDefaults,
  };
}

export async function validateAndFillIntake(input: ValidateIntakeInput): Promise<ValidateIntakeResult> {
  const route = await getCategoryRouteBySlug(input.domain, input.categorySlug);
  const constraints = (route?.technicalConstraints ?? {}) as TechnicalConstraints;
  return validateAgainstConstraints(input.data, constraints);
}
