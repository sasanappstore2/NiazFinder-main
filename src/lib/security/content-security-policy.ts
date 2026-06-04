/**
 * Content-Security-Policy for Next.js responses.
 * Allows self-hosted assets only; dev adds chat-service + MinIO connect/img origins.
 */

function parseOrigin(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).origin;
  } catch {
    return null;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function buildContentSecurityPolicy(): string {
  const connectExtras = unique([
    parseOrigin(process.env.MINIO_PUBLIC_URL) ?? '',
    parseOrigin(process.env.NEXT_PUBLIC_JANUS_WS_URL) ?? '',
  ]);

  const imgExtras = unique([parseOrigin(process.env.MINIO_PUBLIC_URL) ?? '']);

  const connectSrc = ["'self'", 'ws:', 'wss:', ...connectExtras].join(' ');
  const imgSrc = ["'self'", 'data:', 'blob:', ...imgExtras].join(' ');

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
