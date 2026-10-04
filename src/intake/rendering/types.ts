import type { NeedDraft } from '@/contracts/need-intake';
import type { City } from '@/lib/location-system';
import type { IntakeEntities } from '@/intake/types';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';

export interface IntakeRenderContext {
  needDraft: NeedDraft | null;
  entities: IntakeEntities | null;
  answers: Record<string, string | number | boolean | string[]>;
  selectedLeafCategorySlug: string;
  selectedCity: string;
  selectedNeighborhood: string;
  categorySuggestions: Array<{ value: string; label: string }>;
  /** True when shop-rent vs office-rent must be chosen via chips (no auto-fill). */
  commercialCategoryAmbiguous?: boolean;
  /** True when rule-ranked category candidates need user pick. */
  categoryAmbiguous?: boolean;
  neighborhoodOptions: ManagedNeighborhood[];
  neighborhoodsLoading: boolean;
  promptNeighborhoodPick: boolean;
  myLocationLoading: boolean;
  neighborhoodDisambiguationChips: Array<{ value: string; label: string }>;
  locationSuggestionChips?: Array<{ value: string; label: string }>;
  onLocationSuggestionSelect?: (value: string) => void;
  /** AI/rules suggestions for critical optional filters (chip-only, no auto-fill). */
  filterSuggestions?: Record<string, Array<{ value: string; label: string; confidence?: number }>>;
  criticalFieldKeys?: ReadonlySet<string>;
  /** Required/low-confidence keys to highlight — not a visual redesign. */
  missingFieldKeys?: ReadonlySet<string>;
  onFilterSuggestionSelect?: (fieldKey: string, value: string | number | string[]) => void;
  onCategoryChange: (
    payload:
      | string
      | { slug: string; categorySlug: string; subcategorySlug: string | null },
    opts?: { userInitiated?: boolean }
  ) => void;
  onCityChange: (city: City | null) => void;
  onNeighborhoodChange: (
    name: string,
    id?: string | null,
    opts?: { fromUser?: boolean }
  ) => void;
  onMapPinChange: (coords: { lat: number; lng: number } | null) => void;
  onMyLocation: () => void;
  onPromptNeighborhoodHandled: () => void;
  onFieldChange: (key: string, value: string | number | string[]) => void;
  disabled?: boolean;
}
