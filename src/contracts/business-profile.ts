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

export interface BusinessExtension {
  restaurant?: RestaurantExtension;
  doctor?: DoctorExtension;
  salon?: SalonExtension;
  realEstate?: RealEstateExtension;
  mechanic?: MechanicExtension;
  company?: CompanyExtension;
  coach?: CoachExtension;
  /** Optional layout overrides stored in extensions JSON */
  _layout?: ProfileLayoutConfig;
}

// ─── Profile layout / section engine ─────────────────────────────────────────

export type ProfileTemplate =
  | 'company'
  | 'professional'
  | 'agency'
  | 'store'
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
