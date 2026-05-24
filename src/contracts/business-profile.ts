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

export interface BusinessExtension {
  restaurant?: RestaurantExtension;
  doctor?: DoctorExtension;
  salon?: SalonExtension;
  realEstate?: RealEstateExtension;
  mechanic?: MechanicExtension;
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
