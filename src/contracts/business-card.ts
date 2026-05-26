export interface BusinessCardData {
  id: string;
  displayName: string;
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

export interface BusinessCardProps {
  business: BusinessCardData;
  href?: string;
  onClick?: () => void;
  variant?: 'grid' | 'list';
  className?: string;
}
