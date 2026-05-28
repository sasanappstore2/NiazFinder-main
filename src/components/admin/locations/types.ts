export interface ManagedNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  areas?: string[];
  isActive: boolean;
  order: number;
}

export interface ManagedCity {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  isPopular?: boolean;
  isIsland?: boolean;
  order: number;
  neighborhoods: ManagedNeighborhood[];
}

export interface ManagedProvince {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  order: number;
  cities: ManagedCity[];
}
