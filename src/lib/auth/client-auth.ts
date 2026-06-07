/** Client-side auth token + headers (supports both storage keys). */

const TOKEN_KEYS = ['needfinder_auth_token', 'nf_auth_token'] as const;

export function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of TOKEN_KEYS) {
    const t = localStorage.getItem(key);
    if (t) return t;
  }
  return null;
}

export function getClientAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getClientAuthToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getClientAuthJsonHeaders(): HeadersInit {
  return getClientAuthHeaders({ 'Content-Type': 'application/json' });
}

export function clearClientAuthTokens(): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}
