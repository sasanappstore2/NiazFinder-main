const DEFAULT_DEV_ORIGINS = ['localhost:3000', '127.0.0.1:3000'] as const;

/** Next.js may match host-only (192.168.x.x) or host:port — expand both. */
function expandDevOriginEntry(entry: string): string[] {
  const trimmed = entry.trim();
  if (!trimmed) return [];

  const out = new Set<string>([trimmed]);
  const hostPort = /^([^:/]+):(\d+)$/.exec(trimmed);
  if (hostPort) {
    out.add(hostPort[1]!);
  }
  return [...out];
}

/** Parse ALLOWED_DEV_ORIGINS env (comma-separated) merged with localhost defaults. */
export function parseAllowedDevOrigins(): string[] {
  const fromEnv =
    process.env.ALLOWED_DEV_ORIGINS?.split(',')
      .flatMap((entry) => expandDevOriginEntry(entry))
      .filter(Boolean) ?? [];

  return [...new Set([...DEFAULT_DEV_ORIGINS, ...fromEnv])];
}

/** Log configured dev origins once at startup (dev only). */
export function logAllowedDevOriginsIfConfigured(): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (!process.env.ALLOWED_DEV_ORIGINS?.trim()) return;

  const origins = parseAllowedDevOrigins();
  console.warn(
    `[dev] allowedDevOrigins (${origins.length}): ${origins.join(', ')}\n` +
      '  Add LAN/mobile origins via ALLOWED_DEV_ORIGINS in .env.local (e.g. 192.168.x.x:3000)'
  );
}
