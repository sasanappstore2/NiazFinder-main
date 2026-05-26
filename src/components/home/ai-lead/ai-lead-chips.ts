import type { LucideIcon } from 'lucide-react';
import { MapPin, MapPinned, List, Building2 } from 'lucide-react';

export type LeadChipId =
  | 'pick-city'
  | 'geo'
  | 'browse-needs'
  | 'register-business';

export interface LeadChipDefinition {
  id: LeadChipId;
  label: string;
  icon: LucideIcon;
  /** Requires city before enabled (browse chip) */
  requiresCity?: boolean;
}

/** Lead action chips shown below the AI composer */
export const LEAD_ACTION_CHIPS: LeadChipDefinition[] = [
  { id: 'pick-city', label: 'انتخاب شهر', icon: MapPin },
  { id: 'geo', label: 'موقعیت من', icon: MapPinned },
  {
    id: 'browse-needs',
    label: 'مشاهده نیازها',
    icon: List,
    requiresCity: true,
  },
  {
    id: 'register-business',
    label: 'کسب‌وکار دارید؟',
    icon: Building2,
  },
];
