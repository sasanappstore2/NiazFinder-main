/** Geographic slug contract — must match admin-locations.json ids. */
export type ProvinceSlug = string;
export type CitySlug = string;

export type HeatmapMetric =
  | 'sessions'
  | 'pageViews'
  | 'uniqueVisitors'
  | 'bounceRate'
  | 'conversionRate';

export type GeoMapLevel = 'country' | 'province' | 'city';

export type GeoBBox = {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

export type GeoViewBox = {
  width: number;
  height: number;
} & GeoBBox;

export type GeoProvince = {
  id: ProvinceSlug;
  name: string;
  nameEn?: string;
  centroid: { lon: number; lat: number };
  bbox: GeoBBox;
};

export type GeoCity = {
  id: CitySlug;
  provinceId: ProvinceSlug;
  name: string;
  lon: number;
  lat: number;
};

export type HexCell = {
  id: ProvinceSlug;
  name: string;
  cx: number;
  cy: number;
  radius: number;
  hexPath: string;
  /** Province boundary path fitted inside hex cell (local coords). */
  hexLocalPath?: string;
  /** Full SVG path in national viewBox. */
  boundaryPath?: string;
  bbox: { x: number; y: number; width: number; height: number };
};

export type CityHexCell = {
  id: CitySlug;
  name: string;
  cx: number;
  cy: number;
  radius: number;
  hexPath: string;
  lon: number;
  lat: number;
};

export type ProvinceCityLayout = {
  provinceId: ProvinceSlug;
  viewBox: { width: number; height: number };
  boundaryPath: string;
  cities: CityHexCell[];
};

export type NationalHexLayout = {
  viewBox: GeoViewBox;
  cells: HexCell[];
};

export type GeoCountRow = {
  key: string;
  label: string;
  value: number;
  sharePct?: number;
  compareValue?: number;
  compareDelta?: number;
};

export type GeoDetailKpi = {
  sessions: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  conversionRate: number;
  needSessions: number;
  businessSessions: number;
  topPages: Array<{ path: string; views: number }>;
};

export const IRAN_VIEW: GeoViewBox = {
  width: 800,
  height: 520,
  minLon: 44,
  maxLon: 63,
  minLat: 25,
  maxLat: 40,
};

export const HEATMAP_METRIC_LABELS: Record<HeatmapMetric, string> = {
  sessions: 'نشست',
  pageViews: 'بازدید صفحه',
  uniqueVisitors: 'بازدیدکننده یکتا',
  bounceRate: 'نرخ پرش',
  conversionRate: 'نرخ تبدیل',
};
