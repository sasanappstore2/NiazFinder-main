/** API response DTOs for service layer mapping */

export interface ApiRequestRow {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: string;
  city?: string;
  province?: string;
  categoryId?: string;
  category?: { id: string; name: string; icon?: string };
  status?: string;
  priority?: string;
  viewCount?: number;
  proposalCount?: number;
  createdAt?: string;
  tags?: string[];
}

export interface ApiSpecialistRow {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  province?: string;
  rating?: number;
  projectCount?: number;
  completionRate?: number;
  responseRate?: number;
  skills?: string[];
  isVerified?: boolean;
  online?: boolean;
}
