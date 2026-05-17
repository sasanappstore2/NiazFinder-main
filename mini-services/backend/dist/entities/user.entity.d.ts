import { BaseEntity } from './base.entity';
export declare enum UserRole {
    CLIENT = "CLIENT",
    SPECIALIST = "SPECIALIST",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare class User extends BaseEntity {
    email: string;
    password: string;
    phone: string;
    firstName: string;
    lastName: string;
    displayName: string;
    avatar: string;
    bio: string;
    city: string;
    province: string;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
    isOnline: boolean;
    lastSeenAt: Date | null;
    rating: number;
    projectCount: number;
    completionRate: number;
    emailVerificationToken: string | null;
    resetPasswordToken: string | null;
    resetPasswordExpires: Date | null;
    referralCode: string | null;
    referredById: string | null;
    referredBy: any | null;
    wallet: any;
    skills: any[];
    conversations: any[];
    sentMessages: any[];
    reviews: any[];
    receivedReviews: any[];
    requests: any[];
    proposals: any[];
    bookmarks: any[];
    notifications: any[];
    auditLogs: any[];
}
