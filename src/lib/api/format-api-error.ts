type ValidationIssue = {
  msg?: string;
  message?: string;
  loc?: Array<string | number>;
  path?: Array<string | number>;
};

function isCorruptedObjectString(value: string): boolean {
  return value.includes('[object Object]');
}

/** Turn FastAPI/Zod/Next API error payloads into a human-readable Persian-friendly string. */
export function formatApiError(payload: unknown, fallback = 'عملیات انجام نشد'): string {
  if (payload == null) return fallback;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed || isCorruptedObjectString(trimmed)) return fallback;
    return trimmed;
  }

  if (Array.isArray(payload)) {
    return formatDetail(payload) || fallback;
  }

  if (typeof payload !== 'object') return String(payload);

  const o = payload as Record<string, unknown>;

  if (Array.isArray(o.issues)) {
    const fromIssues = formatDetail(o.issues);
    if (fromIssues) return fromIssues;
  }

  const detail = formatDetail(o.detail);
  if (detail) return detail;

  const fromError = formatDetail(o.error);
  if (fromError) return fromError;

  if (typeof o.error === 'string' && o.error.trim() && !isCorruptedObjectString(o.error)) return o.error;
  if (typeof o.message === 'string' && o.message.trim()) return o.message;

  return fallback;
}

function formatDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const d = item as ValidationIssue;
          const msg = d.msg ?? d.message;
          if (typeof msg === 'string') {
            const locParts = Array.isArray(d.loc)
              ? d.loc.filter((x) => x !== 'body')
              : Array.isArray(d.path)
                ? d.path
                : [];
            const loc = locParts.length ? locParts.join('.') : '';
            return loc ? `${loc}: ${msg}` : msg;
          }
        }
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .filter(Boolean)
      .join(' · ');
  }
  if (typeof detail === 'object') {
    const d = detail as ValidationIssue;
    if (typeof d.msg === 'string') return d.msg;
    if (typeof d.message === 'string') return d.message;
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }
  return String(detail);
}
