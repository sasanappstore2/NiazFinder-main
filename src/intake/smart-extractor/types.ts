/**
 * Smart Extractor types — from SMART_INTAKE_IMPLEMENTATION_PLAN.md
 */

export type SmartTransactionType =
  | 'BUY'
  | 'SELL'
  | 'RENT'
  | 'DEPOSIT_AND_RENT'
  | 'FULL_DEPOSIT'
  | 'DAILY_RENT'
  | 'HOURLY_RENT'
  | 'SERVICE';

export interface SmartExtractionResult {
  category: {
    value: string | null;
    subcategory: string | null;
    confidence: number;
    alternatives?: Array<{
      slug: string;
      label: string;
      confidence: number;
    }>;
  };

  location: {
    city: string | null;
    citySlug: string | null;
    neighborhood: string | null;
    neighborhoodSlug: string | null;
    confidence: number;
    disambiguationNeeded?: boolean;
    alternatives?: Array<{
      neighborhood: string;
      neighborhoodSlug: string;
      district?: string;
      landmarks?: string[];
      mapBounds?: [number, number, number, number];
    }>;
  };

  transaction: {
    type: SmartTransactionType | null;
    dealType?: 'sale' | 'rent' | 'full-mortgage';
    confidence: number;
  };

  budget: {
    min: number | null;
    max: number | null;
    depositAmount?: number | null;
    rentAmount?: number | null;
    depositMin?: number | null;
    depositMax?: number | null;
    rentMin?: number | null;
    rentMax?: number | null;
    confidence: number;
  };

  property: {
    area: number | null;
    rooms: number | null;
    hasParking?: boolean;
    hasElevator?: boolean;
    hasStorage?: boolean;
    floor?: number | null;
    totalFloors?: number | null;
    age?: number | null;
    confidence: number;
  };

  metadata: {
    needTitle?: string;
    needDescription?: string;
    urgency?: 'immediate' | 'this_week' | 'this_month' | 'flexible';
    contactPreference?: 'phone' | 'chat' | 'both';
  };

  validation: {
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
    suggestions: string[];
  };

  trace?: {
    rulesUsed: string[];
    aiCalled: boolean;
    extractionTime: number;
    cacheHit?: boolean;
  };
}

export interface SmartExtractionOptions {
  preferredCity?: string;
  preferredCitySlug?: string;
  sessionHistory?: string[];
  useAI?: boolean;
  useRules?: boolean;
  realTime?: boolean;
  formHints?: Record<string, unknown>;
}

export interface AdvancedRulePatch {
  depositAmount?: number;
  rentAmount?: number;
  depositMin?: number;
  depositMax?: number;
  rentMin?: number;
  rentMax?: number;
  transactionType?: SmartTransactionType;
  categorySlug?: string;
  neighborhood?: string;
  needsDisambiguation?: boolean;
  area?: number;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  hasParking?: boolean;
  hasElevator?: boolean;
  hasStorage?: boolean;
}
