export interface PublicStarredBusiness {
  userId: string;
  name: string;
  slug: string;
  logo: string | null;
  city: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  starredAt: string;
  profileUrl: string;
}
