/**
 * Trims redundant location text when headline already includes neighborhood names.
 */
export function formatCollaborationCardCopy(
  headline: string | null | undefined,
  area: string | null | undefined
): { headline: string; location: string | null } {
  const text = headline?.trim() ?? '';
  const areaText = area?.trim() ?? '';

  if (!areaText) {
    return { headline: text, location: null };
  }

  const parts = areaText.split('·').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { headline: text, location: areaText };
  }

  const city = parts[0] ?? '';
  const hoods = parts.slice(1).join(' · ');
  const hoodsInHeadline =
    hoods.length > 0 && (text.includes(hoods) || hoods.split(' / ').every((h) => text.includes(h)));

  if (hoodsInHeadline) {
    return { headline: text, location: city || null };
  }

  return { headline: text, location: areaText };
}
