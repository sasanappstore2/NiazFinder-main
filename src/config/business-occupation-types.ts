export interface BusinessOccupation {
  slug: string;
  parentSlug: string | null;
  title: string;
  englishTitle?: string;
  depth: 0 | 1;
  sortOrder?: number;
  isActive?: boolean;
}

