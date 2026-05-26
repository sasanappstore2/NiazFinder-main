/** Query params owned by core browse parser (not category attributes). */
export const RESERVED_BROWSE_PARAMS = new Set([
  'type',
  'q',
  'status',
  'city',
  'cities',
  'provinces',
  'neighborhoods',
  'price',
  'priceMin',
  'priceMax',
  'verified',
  'has-photo',
  'urgent',
  'recent',
  'sort',
  'page',
  'view',
  'skill',
  'province',
  'category',
  'categoryId',
  'search',
  'limit',
  'budgetMin',
  'budgetMax',
  'priority',
  'dealType',
  'attrs',
]);

/** Range shorthand params → min/max attribute keys. */
export const RANGE_PARAM_MAP: Record<string, { minKey: string; maxKey: string }> = {
  area: { minKey: 'areaMin', maxKey: 'areaMax' },
  year: { minKey: 'yearMin', maxKey: 'yearMax' },
  mileage: { minKey: 'mileageMin', maxKey: 'mileageMax' },
  salary: { minKey: 'salaryMin', maxKey: 'salaryMax' },
};

export function parseRangeShorthand(
  param: string,
  value: string
): Record<string, string> {
  const map = RANGE_PARAM_MAP[param];
  if (!map) return { [param]: value };
  const m = /^(\d+)?-(\d+)?$/.exec(value.trim());
  if (!m) return {};
  const out: Record<string, string> = {};
  if (m[1]) out[map.minKey] = m[1];
  if (m[2]) out[map.maxKey] = m[2];
  return out;
}
