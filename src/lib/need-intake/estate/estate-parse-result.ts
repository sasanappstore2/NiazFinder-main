/** Ideal estate extraction schema for benchmark / LLM target. */
export type EstateIntent =
  | 'buy'
  | 'rent'
  | 'full_mortgage'
  | 'rent_mortgage'
  | 'partnership'
  | 'pre_purchase'
  | 'sell'
  | 'lease_out'
  | 'swap'
  | 'investment'
  | null;

export type EstatePropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'land'
  | 'shop'
  | 'office'
  | 'warehouse'
  | 'mixed'
  | null;

export interface EstateClarification {
  field: string;
  question: string;
  priority: 'required' | 'helpful';
}

export interface EstateParseResult {
  category: 'estate' | 'out_of_scope';
  intent: EstateIntent;
  property_type: EstatePropertyType;
  location: {
    city: string | null;
    district: string | null;
    neighborhood: string | null;
    ambiguous: boolean;
    needs_clarification: boolean;
  };
  area: {
    min: number | null;
    max: number | null;
    exact: number | null;
  };
  budget: {
    purchase_price?: { min: number | null; max: number | null };
    mortgage?: { amount: number | null };
    rent?: { amount: number | null };
    unit: 'toman';
  };
  rooms: number | null;
  features: {
    parking: boolean | null;
    elevator: boolean | null;
    storage: boolean | null;
    furnished: boolean | null;
    floor: { min: number | null; max: number | null } | null;
    building_age_max: number | null;
    direction: 'north' | 'south' | 'east' | 'west' | null;
    document_type: 'shakhsi' | 'vaghfi' | 'other' | null;
  };
  urgency: 'normal' | 'urgent' | null;
  clarifications_needed: EstateClarification[];
  missing_prerequisites: string[];
  confidence: number;
}

/** Partial expected values for benchmark scoring. */
export interface EstateExpected {
  category?: 'estate' | 'out_of_scope';
  intent?: EstateIntent | EstateIntent[];
  property_type?: EstatePropertyType | EstatePropertyType[];
  location?: Partial<EstateParseResult['location']>;
  area?: Partial<EstateParseResult['area']>;
  budget?: {
    purchase_price?: { min?: number | null; max?: number | null };
    mortgage?: { amount?: number | null };
    rent?: { amount?: number | null };
    unit?: 'toman';
  };
  rooms?: number | null;
  urgency?: 'normal' | 'urgent' | null;
  /** Field keys that MUST appear in clarifications or missing_prerequisites */
  must_clarify?: string[];
  /** Field keys that must NOT trigger clarification */
  must_not_clarify?: string[];
  features?: Partial<EstateParseResult['features']>;
}

export interface EstateBenchmarkCase {
  id: string;
  group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  input: string;
  expected: EstateExpected;
  notes?: string;
}

export const ESTATE_FIELD_WEIGHTS = {
  intent: 20,
  property_type: 15,
  location_city: 12,
  location_neighborhood: 8,
  clarifications_asked_correctly: 15,
  budget: 12,
  area: 8,
  rooms: 5,
  features: 5,
} as const;
