/**
 * Content-Security-Policy for Next.js responses.
 * Allows self-hosted assets only; dev adds chat-service + MinIO connect/img origins.
 *
 * Nonce-based CSP (removing 'unsafe-inline' from script-src/style-src) is deferred:
 * Next.js App Router still relies on inline hydration/style chunks unless we add a
 * custom nonce middleware and wire it through every layout — tracked for a later pass.
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

  const imgExtras = unique([
    parseOrigin(process.env.MINIO_PUBLIC_URL) ?? '',
    'https://unpkg.com',
  ]);

  const mapboxConnect = [
    'https://api.mapbox.com',
    'https://events.mapbox.com',
    'https://*.tiles.mapbox.com',
  ];
  const mapboxImg = ['https://api.mapbox.com', 'https://*.tiles.mapbox.com'];
  const connectSrc = ["'self'", 'ws:', 'wss:', ...mapboxConnect, ...connectExtras].join(' ');
  const imgSrc = ["'self'", 'data:', 'blob:', ...mapboxImg, ...imgExtras].join(' ');

  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval': MapLibre's RTL text plugin instantiates WebAssembly
    // (Persian label shaping) — without it map labels silently break.
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "child-src blob:",
    "media-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
