/** Multi-layer intelligence extracted from conversational intake (v2). */

export type NeedUrgency = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NeedMotivation =
  | 'investment'
  | 'residence'
  | 'business'
  | 'migration'
  | 'preservation'
  | 'forced';

export type NeedFinancialStatus = 'cash' | 'loan' | 'mixed' | 'needs_sale';

export interface NeedIntelligenceLocation {
  city?: string;
  district?: string;
  neighborhood?: string;
  radiusKm?: number;
}

export interface NeedIntelligenceBudget {
  min?: number;
  max?: number;
  flexible?: boolean;
}

export interface NeedIntelligenceArea {
  min?: number;
  max?: number;
  approximate?: boolean;
}

export interface NeedIntelligenceProfile {
  transaction?: string;
  propertyType?: string;
  location?: NeedIntelligenceLocation;
  budget?: NeedIntelligenceBudget;
  area?: NeedIntelligenceArea;
  urgency?: NeedUrgency;
  motivation?: NeedMotivation;
  intentScore?: number;
  financialStatus?: NeedFinancialStatus;
  mustHave?: string[];
  niceToHave?: string[];
  priorities?: string[];
  lifestyleSignals?: string[];
  locationPreferences?: string[];
  freeformNotes?: string[];
}

export function emptyIntelligenceProfile(): NeedIntelligenceProfile {
  return {};
}
