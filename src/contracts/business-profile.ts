/**
 * Universal Business Profile — canonical TypeScript contract.
 * 80% shared structure + 20% category extensions (plugins).
 */

// ─── Primitives ─────────────────────────────────────────────────────────────

export type BusinessStatus = 'active' | 'inactive';
export type OfferCtaType = 'book' | 'quote' | 'call' | 'chat';
export type PortfolioMediaType = 'image' | 'video' | 'before_after';

// ─── Core nested types ───────────────────────────────────────────────────────

export interface BusinessLocation {
  city: string;
  province?: string;
  address?: string;
  geo?: { lat: number; lng: number };
}

export interface BusinessIdentity {
  logo?: string;
  coverImage?: string;
  description: string;
  category: string[];
  tags: string[];
  location: BusinessLocation;
  status: BusinessStatus;
}

export interface BusinessTrust {
  rating: number;
  reviewCount: number;
  verified: boolean;
  badges: string[];
  responseRate: number;
  responseTime?: string;
  yearsActive: number;
}

export interface BusinessContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  chatEnabled: boolean;
}

export interface BusinessSeo {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
}

export interface BusinessAnalytics {
  views: number;
  clicks: number;
  conversions: number;
  saves: number;
}

export interface AiAssistantConfig {
  systemPrompt: string;
  dynamicQuestions: string[];
  categoryHint?: string;
}

// ─── Offer / Portfolio / Review ────────────────────────────────────────────────

export interface OfferFaq {
  q: string;
  a: string;
}

export interface OfferVariant {
  id: string;
  name: string;
  price?: string;
  imageUrl?: string;
}

export interface BusinessOffer {
  id: string;
  title: string;
  description: string;
  priceRange?: string;
  duration?: string;
  images: string[];
  features: string[];
  faq?: OfferFaq[];
  ctaType: OfferCtaType;
  /** @deprecated use categoryIds — legacy single shelf */
  vitrineCategoryId?: string | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  variants?: OfferVariant[];
  brandId?: string | null;
  brandName?: string;
}

export interface PortfolioItemMetadata {
  cost?: number;
  duration?: string;
  beforeUrl?: string;
  afterUrl?: string;
}

export interface BusinessPortfolioItem {
  id: string;
  type: PortfolioMediaType;
  title: string;
  description?: string;
  mediaUrl: string;
  metadata?: PortfolioItemMetadata;
}

export interface BusinessReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string;
}

// ─── Category extensions (plugins) ───────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  image?: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  price?: string;
  area?: string;
  rooms?: number;
  image?: string;
  /** Up to 5 gallery images; `image` mirrors the cover (`images[0]`). */
  images?: string[];
  deposit?: string;
  monthlyRent?: string;
  floor?: number;
  deedType?: string;
  pricePerMeter?: string;
  plotWidth?: string;
  /** Neighborhood / district label shown on listing cards. */
  location?: string;
  /** Canonical need-market category slug (e.g. apartment-sale). */
  categorySlug?: string;
  neighborhoodId?: string;
  cityId?: string;
  /** @deprecated Use categorySlug — legacy compact type key */
  propertyType?: string;
  /** Short description for cards. */
  description?: string;
  /** Lifecycle status — drives Active vs Sold widgets. Defaults to `active`. */
  status?: 'active' | 'sold' | 'rented';
  /** ISO timestamp — regional imports / admin filings. */
  createdAt?: string;
  /** Portal file code (e.g. maskanyaban کد فایل). */
  fileCode?: string;
  /** Building age in years — regional filings. */
  buildingAge?: number;
  /** Compass / land orientation — regional filings. */
  orientation?: string;
  /** Facade material — villa / apartment filings. */
  facade?: string;
  /** Land use label — زمین filings (also in sourceMeta). */
  landUse?: string;
  /** Shop frontage in meters. */
  frontage?: string;
  /** Commercial use type — مغازه / تجاری. */
  commercialUse?: string;
  /** Original post date on source portal. */
  postedAt?: string;
  /** Source portal key (e.g. maskanyaban). */
  sourceSite?: string;
  /** Sale vs rent — drives the Rental Properties widget. */
  dealType?:
    | 'sell'
    | 'rent_rahn_ejare'
    | 'rent_rahn_full'
    | 'rent_short_term'
    | 'sale'
    | 'rent';
  /** Regional filing amenity flags for browse filters. */
  amenities?: {
    parking?: boolean;
    storage?: boolean;
    elevator?: boolean;
    securityDoor?: boolean;
    exchangeable?: boolean;
    terrace?: boolean;
    builtInWardrobe?: boolean;
  };
}

export interface RestaurantExtension {
  menu: MenuItem[];
  reservationEnabled: boolean;
  busyHours: string[];
}

export interface DoctorExtension {
  specialties: string[];
  insuranceAccepted: string[];
  appointmentSlots: string[];
}

export interface SalonExtension {
  serviceStyles: string[];
  instagram?: string;
}

export interface RealEstateExtension {
  listings: PropertyListing[];
}

export interface MechanicExtension {
  supportedBrands: string[];
  emergencyService: boolean;
}

export interface CompanyExtension {
  legalName?: string;
  registrationNumber?: string;
  industry?: string;
  employeeCount?: string;
  website?: string;
  foundedYear?: number;
  description?: string;
}

export interface CoachExtension {
  sport?: string;
  ageGroups?: string[];
  trainingLocation?: string;
  instagram?: string;
  certifications?: string[];
}

/** Custom vitrine shelf for store / online_store profiles. */
export interface StorefrontCategory {
  id: string;
  title: string;
  sortOrder: number;
}

/** Product brand (e.g. Samsung, Nike) — scoped to business storefront. */
export interface StorefrontBrand {
  id: string;
  title: string;
  sortOrder: number;
}

export interface StorefrontExtension {
  categories: StorefrontCategory[];
  brands?: StorefrontBrand[];
}

/** Website + Iranian social channels (onboarding / online sellers). */
export interface WebPresenceExtension {
  website?: string;
  instagram?: string;
  telegram?: string;
  bale?: string;
  rubika?: string;
  eitaa?: string;
}

export interface BusinessExtension {
  restaurant?: RestaurantExtension;
  doctor?: DoctorExtension;
  salon?: SalonExtension;
  realEstate?: RealEstateExtension;
  mechanic?: MechanicExtension;
  company?: CompanyExtension;
  coach?: CoachExtension;
  webPresence?: WebPresenceExtension;
  storefront?: StorefrontExtension;
  /** Optional layout overrides stored in extensions JSON */
  _layout?: ProfileLayoutConfig;
}

// ─── Profile layout / section engine ─────────────────────────────────────────

export type ProfileTemplate =
  | 'company'
  | 'professional'
  | 'agency'
  | 'store'
  | 'online_store'
  | 'real_estate'
  | 'services'
  | 'restaurant'
  | 'coach';

export type ProfileTabId =
  | 'intro'
  | 'products'
  | 'services'
  | 'portfolio'
  | 'gallery'
  | 'listings'
  | 'menu'
  | 'company'
  | 'needs'
  | 'reviews';

/** @deprecated Use ProfileTabId — kept for backward-compatible stored values */
export type ProfilePrimaryTab = ProfileTabId;

export type ProfileSectionId =
  | 'hero'
  | 'highlights'
  | 'about'
  | 'services'
  | 'products'
  | 'portfolio'
  | 'gallery'
  | 'listings'
  | 'menu'
  | 'credentials'
  | 'companyProfile'
  | 'companyNeeds'
  | 'trust'
  | 'contact'
  | 'seo';

export interface ProfileLayoutConfig {
  template?: ProfileTemplate;
  sectionOrder?: ProfileSectionId[];
  labels?: Partial<Record<ProfileSectionId, string>>;
  /** Tab shown first when visitors open the profile */
  defaultTab?: ProfileTabId;
}

export interface ResolvedProfileSection {
  id: ProfileSectionId;
  label: string;
  visible: boolean;
  anchor: string;
}

export interface ResolvedProfileLayout {
  template: ProfileTemplate;
  sections: ResolvedProfileSection[];
}

// ─── Root entity ─────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  userId: string;
  name: string;
  slug: string;
  identity: BusinessIdentity;
  trust: BusinessTrust;
  offers: BusinessOffer[];
  portfolio: BusinessPortfolioItem[];
  reviews: BusinessReview[];
  aiAssistantConfig: AiAssistantConfig;
  contact: BusinessContact;
  seo: BusinessSeo;
  analytics: BusinessAnalytics;
  extensions?: BusinessExtension;
  layoutConfig?: ProfileLayoutConfig;
}

/** API list row (browse cards). */
export interface BusinessListItem {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  city: string;
  category: string[];
  rating: number;
  reviewCount: number;
  verified: boolean;
  tags: string[];
}

/** Assistant chat message. */
export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantChatRequest {
  businessId: string;
  messages: AssistantMessage[];
  intent?: string;
}

export interface AssistantChatResponse {
  reply: string;
  suggestedOffers?: string[];
  suggestedCta?: OfferCtaType;
  followUpQuestions?: string[];
}

// ─── Business team (public subset) ───────────────────────────────────────────

export type BusinessMemberRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface BusinessContactPointPublic {
  id: string;
  label: string;
  slug: string;
  description?: string;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  assignee: {
    id: string;
    displayName: string;
    avatar?: string;
    online: boolean;
  };
}

export interface BusinessMemberPublic {
  userId: string;
  role: BusinessMemberRole;
  displayName: string;
}
