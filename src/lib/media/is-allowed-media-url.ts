/** Origins allowed for absolute media URLs (same site + internal MinIO). */
export function getAllowedMediaOrigins(): string[] {
  const origins: string[] = [];
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.MINIO_PUBLIC_URL,
  ]) {
    if (!raw?.trim()) continue;
    try {
      origins.push(new URL(raw.trim()).origin);
    } catch {
      /* ignore invalid env */
    }
  }
  return [...new Set(origins)];
}

/** Reject external CDN URLs; allow local paths and configured internal storage. */
export function isAllowedMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/images/')) {
    return true;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return true;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const origin = new URL(trimmed).origin;
      return getAllowedMediaOrigins().includes(origin);
    } catch {
      return false;
    }
  }

  return false;
}

export function assertAllowedMediaUrls(
  urls: string[],
  label = 'آدرس رسانه'
): string | null {
  for (const url of urls) {
    if (!isAllowedMediaUrl(url)) {
      return `${label} باید از مسیر داخلی (/uploads/ یا /images/) یا storage داخلی باشد`;
    }
  }
  return null;
}
