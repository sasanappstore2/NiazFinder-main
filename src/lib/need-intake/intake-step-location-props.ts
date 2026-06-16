import type { NeedDraft } from '@/contracts/need-intake';
import type { City } from '@/lib/location-system';

/** Props shared by location/refine wizard step logic (component may live elsewhere). */
export interface IntakeStepLocationProps {
  needDraft: NeedDraft | null;
  detailsText: string;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCity: string;
  selectedNeighborhood: string;
  selectedLeafCategorySlug: string;
  enabledSections: Set<string>;
  onEnabledSectionsChange: (sections: Set<string>) => void;
  intakeDisplaySections: string[];
  categorySuggestions: Array<{ slug: string; title: string; score?: number }>;
  neighborhoodDisambiguationChips: string[];
  locationSuggestionChips: string[];
  neighborhoodOptions: string[];
  neighborhoodsLoading: boolean;
  promptNeighborhoodPick: boolean;
  onPromptNeighborhoodPickHandled: () => void;
  myLocationLoading: boolean;
  aiShardStatus: Record<string, unknown>;
  aiEnriching: boolean;
  showField: (field: string) => boolean;
  isSectionFilled: (section: string) => boolean;
  onBack: () => void;
  onContinue: () => void;
  onApplyMyLocation: () => void;
  onApplyCategorySlug: (slug: string) => void;
  onApplyCategoryFromMegaMenu: (slug: string) => void;
  onApplyCityRecord: (city: City) => void;
  onApplyCity: (cityName: string) => void;
  onApplyNeighborhood: (neighborhood: string) => void;
  onPatchNeedDraftEntities: (patch: Record<string, unknown>) => void;
  onPatchIntakeAnswer: (key: string, value: unknown) => void;
}
