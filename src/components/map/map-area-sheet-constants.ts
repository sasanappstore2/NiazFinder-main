/** Peek collapsed ? header only */
export const MAP_AREA_SHEET_PEEK = 'peek';

export const MAP_AREA_SHEET_SNAP_MID = 0.55;
export const MAP_AREA_SHEET_SNAP_FULL = 0.85;

/** Chrome: handle + title row + divider */
export const MAP_AREA_SHEET_PEEK_COMPACT_PX = 52;
/** Horizontal peek row */
export const MAP_AREA_SHEET_PEEK_TEASER_PX = 52;
/** Padding around peek row */
export const MAP_AREA_SHEET_PEEK_ROW_PAD_PX = 8;
export const MAP_AREA_SHEET_PEEK_WITH_ITEMS_PX =
  MAP_AREA_SHEET_PEEK_COMPACT_PX +
  MAP_AREA_SHEET_PEEK_ROW_PAD_PX +
  MAP_AREA_SHEET_PEEK_TEASER_PX +
  MAP_AREA_SHEET_PEEK_ROW_PAD_PX;

/** @deprecated use compact/with-items helpers */
export const MAP_AREA_SHEET_PEEK_PX = MAP_AREA_SHEET_PEEK_COMPACT_PX;

export function resolveMapAreaPeekHeightPx(hasPreviewItems: boolean): number {
  return hasPreviewItems ? MAP_AREA_SHEET_PEEK_WITH_ITEMS_PX : MAP_AREA_SHEET_PEEK_COMPACT_PX;
}
