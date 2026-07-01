import type { FilingDetailSpecRow } from '@/lib/filing/filing-detail-sections';
import type { FilingTemplateSpecKey } from '@/lib/filing/filing-category-templates';
import {
  BedDouble,
  Building2,
  Compass,
  FileText,
  Layers,
  MapPin,
  Ruler,
  Store,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_BY_KEY: Partial<Record<FilingTemplateSpecKey, LucideIcon>> = {
  floor: Layers,
  rooms: BedDouble,
  buildingAge: Building2,
  orientation: Compass,
  documentType: FileText,
  landUse: MapPin,
  frontage: Ruler,
  commercialUse: Store,
  plotWidth: Ruler,
};

type Props = {
  specs: FilingDetailSpecRow[];
  quickStatKeys?: readonly FilingTemplateSpecKey[];
};

export function FilingQuickStats({ specs, quickStatKeys }: Props) {
  const keys = quickStatKeys?.length
    ? quickStatKeys
    : (['floor', 'rooms', 'buildingAge', 'orientation'] as const);

  const highlights = keys
    .map((key) => {
      const spec = specs.find((s) => s.key === key);
      if (!spec?.value) return null;
      const Icon = ICON_BY_KEY[key] ?? Building2;
      return { ...spec, icon: Icon };
    })
    .filter(Boolean) as Array<FilingDetailSpecRow & { icon: LucideIcon }>;

  if (!highlights.length) return null;

  return (
    <div className="filing-quick-stats" role="list" aria-label="خلاصه مشخصات">
      {highlights.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="filing-quick-stat" role="listitem">
            <span className="filing-quick-stat__icon">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="filing-quick-stat__label">{item.label}</span>
            <span className="filing-quick-stat__value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
