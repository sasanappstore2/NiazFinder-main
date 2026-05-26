export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  requestCount?: number;
  specialistCount?: number;
}

export interface CategoryAppearance {
  color: string;
  iconName?: string;
}
