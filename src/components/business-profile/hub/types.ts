import type { HubTaskId } from '@/lib/business/profile-completion';

export type { HubTaskId };

export type BusinessHubProfile = {
  slug: string;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  categorySlugs: string[];
  occupationSlugs: string[];
  primaryCategorySlug: string | null;
  city: string;
  province: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  whatsapp: string;
  email: string;
  chatEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  website: string;
  instagram: string;
  telegram: string;
  bale: string;
  rubika: string;
  eitaa: string;
  verified: boolean;
  viewCount: number;
  publicUrl: string;
  suggestedProfileSlug: string | null;
  onboardingCompleted: boolean;
  offerCount: number;
  portfolioCount: number;
  storefrontCategoryCount: number;
};

export type BusinessHubProfilePatch = Partial<
  Pick<
    BusinessHubProfile,
    | 'name'
    | 'slug'
    | 'description'
    | 'logo'
    | 'coverImage'
    | 'city'
    | 'province'
    | 'address'
    | 'lat'
    | 'lng'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'chatEnabled'
    | 'seoTitle'
    | 'seoDescription'
    | 'website'
    | 'instagram'
    | 'telegram'
    | 'bale'
    | 'rubika'
    | 'eitaa'
  >
> & {
  offerCount?: number;
  portfolioCount?: number;
  storefrontCategoryCount?: number;
};
