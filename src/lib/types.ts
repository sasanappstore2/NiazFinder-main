// ============ App Views ============
export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'post-need'
  | 'browse-requests'
  | 'request-detail'
  | 'browse-specialists'
  | 'specialist-profile'
  | 'dashboard'
  | 'messages'
  | 'notifications'
  | 'admin'
  | 'profile'
  | 'pricing'
  | 'compare-specialists'
  | 'submit-proposal'
  | 'submit-review'
  | 'referral';

// ============ User ============
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  province?: string;
  role: 'CLIENT' | 'SPECIALIST' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  isActive: boolean;
  online: boolean;
  rating: number;
  projectCount: number;
  completionRate: number;
  responseRate: number;
  createdAt: string;
}

// ============ Category ============
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  requestCount: number;
  specialistCount: number;
}

// ============ Service Request ============
export interface ServiceRequest {
  id: string;
  title: string;
  slug: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  deliveryTime?: number;
  deliveryUnit: string;
  city?: string;
  province?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  tags: string[];
  viewCount: number;
  proposalCount: number;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'city' | 'createdAt'>;
  createdAt: string;
  updatedAt: string;
}

// ============ Proposal ============
export interface Proposal {
  id: string;
  price: number;
  deliveryTime?: number;
  deliveryUnit: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  isRead: boolean;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'rating' | 'projectCount' | 'isVerified' | 'bio' | 'city'>;
  createdAt: string;
}

// ============ Specialist Profile ============
export interface SpecialistProfile extends User {
  skills: { name: string; level: number }[];
  portfolios: Portfolio[];
  hourlyRate?: number;
  minProjectPrice?: number;
  memberSince: string;
  responseTime?: string;
  completedProjects: number;
}

// ============ Portfolio ============
export interface Portfolio {
  id: string;
  title: string;
  description?: string;
  imageUrls: string[];
  videoUrl?: string;
  projectUrl?: string;
  clientName?: string;
  completedAt?: string;
}

// ============ Message ============
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  sender?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
}

// ============ Conversation ============
export interface Conversation {
  id: string;
  requestId?: string;
  otherUser: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'online'>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

// ============ Notification ============
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

// ============ Review ============
export interface Review {
  id: string;
  rating: number;
  comment?: string;
  response?: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  createdAt: string;
}

// ============ Wallet ============
export interface Wallet {
  id: string;
  balance: number;
  frozen: number;
}

// ============ Transaction ============
export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT' | 'REFUND' | 'COMMISSION' | 'BONUS';
  amount: number;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
}

// ============ Dashboard Stats ============
export interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  completedProjects: number;
  totalEarnings: number;
  pendingProposals: number;
  avgRating: number;
  responseRate: number;
  profileCompletion: number;
}

// ============ Pricing Plan ============
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  icon?: string;
}

// ============ Search Filters ============
export interface SearchFilters {
  query?: string;
  categoryId?: string;
  city?: string;
  province?: string;
  budgetMin?: number;
  budgetMax?: number;
  sortBy?: 'newest' | 'oldest' | 'budget_low' | 'budget_high' | 'most_proposals';
  status?: string;
  page?: number;
  limit?: number;
}
