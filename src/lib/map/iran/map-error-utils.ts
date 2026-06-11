/** Vector tile/glyph hiccups should not swap the whole browse map to raster memaps. */
export function isFatalIranVectorMapError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (!msg.trim()) return false;
  if (/failed to load style|could not parse style|style.*invalid/i.test(msg)) return true;
  if (/glyph|sprite|tile|source|network|fetch|404|timeout/i.test(msg)) return false;
  return false;
}
