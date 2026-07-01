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
  | 'workspace'
  | 'messages'
  | 'notifications'
  | 'admin'
  | 'profile'
  | 'pricing'
  | 'submit-proposal'
  | 'submit-review'
  | 'referral'
  | 'notification-settings'
  | 'bookmarks';

// ============ User ============
export interface User {
  id: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  coverImage?: string;
  website?: string;
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
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
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
  /** Optional free-form address; may start with neighborhood. */
  address?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  deliveryTime?: number;
  deliveryUnit: string;
  city?: string;
  province?: string;
  categoryId: string;
  subcategoryId?: string | null;
  categoryName: string;
  categorySlug?: string;
  categoryIcon?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING_REVIEW' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED_SOFT' | 'REJECTED_FINAL';
  rejectionReason?: string | null;
  tags: string[];
  viewCount: number;
  proposalCount: number;
  /** Parsed from published dynamicAnswers for budget/deal display. */
  dealType?: string;
  rahnAmount?: number;
  monthlyRent?: number;
  deposit?: number;
  nightlyRent?: number;
  dynamicAnswers?: Record<string, unknown>;
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
  /** Public profile slug for `/b/{slug}` URLs. */
  profileSlug?: string;
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
export interface MessageReactionItem {
  emoji: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'SYSTEM' | 'NEED_CARD' | 'OFFER_CARD' | 'CALL' | 'PROPOSAL';
  attachmentUrls?: string[];
  isRead: boolean;
  createdAt: string;
  clientTempId?: string;
  replyToId?: string;
  replyTo?: { id: string; content: string; senderFirstName: string; senderLastName: string };
  reactions?: MessageReactionItem[];
  deletedAt?: string | null;
  editedAt?: string | null;
  isPinned?: boolean;
  pinnedBy?: string | null;
  pinnedAt?: string | null;
  sender?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
}

// ============ Conversation ============
export interface Conversation {
  id: string;
  requestId?: string;
  contactPointId?: string | null;
  businessProfileId?: string | null;
  otherUser: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'online'> & {
    lastSeenAt?: string | null;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  businessContext?: {
    businessName: string;
    contactLabel: string;
    logo: string | null;
  };
  /** طرف مقابل در این گفتگو در حال تایپ است */
  isPeerTyping?: boolean;
  /** گفتگوی ثابت با ربات/دستیار پلتفرم */
  isPlatformBot?: boolean;
}

// ============ Notification ============
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, string | undefined>;
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

// ============ Social Post ============
export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrls: string;
  isPrivate: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'displayName' | 'avatar' | 'username'>;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  _count?: { likes: number; comments: number };
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'displayName' | 'avatar' | 'username'>;
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface FollowResponse {
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  following?: boolean;
  message?: string;
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
