export interface NeedCardData {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: string;
  city?: string;
  province?: string;
  address?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  status?: string;
  priority?: string;
  viewCount?: number;
  proposalCount?: number;
  createdAt?: string;
  tags?: string[];
}

export interface NeedCardProps {
  need: NeedCardData;
  href?: string;
  onClick?: () => void;
  variant?: 'grid' | 'list' | 'compact' | 'chat';
  className?: string;
}
