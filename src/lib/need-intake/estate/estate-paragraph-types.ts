export interface EstateParagraphOracle {
  leaf: string[];
  deal: string;
  city: string;
  neighborhood?: string;
  area?: { min?: number; max?: number; exact?: number };
  rooms?: number | null;
  budget?: { max?: number; rahn?: number; rent?: number };
  hard: Array<'category' | 'deal' | 'area' | 'rooms'>;
  weighted: Array<'location' | 'budget'>;
  ambiguous: boolean;
  expectQuestion: boolean;
  hallucinationTrap: boolean;
}

export interface EstateParagraphCase {
  id: string;
  index: number;
  seed: number;
  text: string;
  oracle: EstateParagraphOracle;
  tags: string[];
}
