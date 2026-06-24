export type BusinessOwner = {
  id: string;
  phone: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type BusinessDetail = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  description: string | null;
  categorySlugs: string;
  tags: string;
  city: string | null;
  province: string | null;
  address: string | null;
  status: string;
  verified: boolean;
  leadAlertsEnabled: boolean;
  chatEnabled: boolean;
  rating: number;
  reviewCount: number;
  trustScore: number;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: BusinessOwner;
  _count: {
    offers: number;
    portfolioItems: number;
    profileReviews: number;
    leadOutreach: number;
    members: number;
  };
};

export type BusinessProfileForm = {
  name: string;
  slug: string;
  description: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  status: string;
  verified: boolean;
  leadAlertsEnabled: boolean;
  chatEnabled: boolean;
};

export type BusinessMemberRow = {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: BusinessOwner;
};

export type BusinessOfferRow = {
  id: string;
  title: string;
  description: string;
  priceRange: string | null;
  duration: string | null;
  isPublished: boolean;
};

export type BusinessPortfolioRow = {
  id: string;
  title: string;
  mediaUrl: string;
  type: string;
  isPublished: boolean;
};

export type BusinessOutreachRow = {
  id: string;
  status: string;
  matchScore: number;
  matchReasonFa: string;
  createdAt: string;
  request: { id: string; title: string };
};

export type BusinessReviewRow = {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  isPublished: boolean;
  createdAt: string;
};

export type BusinessTabId =
  | 'overview'
  | 'edit'
  | 'team'
  | 'offers'
  | 'portfolio'
  | 'outreach'
  | 'reviews'
  | 'ecosystem'
  | 'moderation';
