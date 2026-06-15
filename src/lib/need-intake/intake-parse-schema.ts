/** Minimal parse-gap types (manual wizard ? no MLX). */

export type IntakeParseGapKind = 'missing' | 'uncertain' | 'clarify';

export interface IntakeParseGap {
  id: string;
  kind: IntakeParseGapKind;
  messageFa: string;
  fieldKey?: string;
}

export type IntakeLocationStatus =
  | 'resolved'
  | 'city_ambiguous'
  | 'neighborhood_ambiguous'
  | 'missing_city';

export interface IntakeParseCityCandidate {
  citySlug: string;
  score?: number;
}
