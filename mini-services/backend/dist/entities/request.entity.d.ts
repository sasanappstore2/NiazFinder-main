import { BaseEntity } from './base.entity';
export declare enum BudgetType {
    FIXED = "FIXED",
    HOURLY = "HOURLY",
    NEGOTIABLE = "NEGOTIABLE"
}
export declare enum DeliveryUnit {
    DAY = "day",
    HOUR = "hour",
    MONTH = "month"
}
export declare enum RequestPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum RequestStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}
export declare class Request extends BaseEntity {
    title: string;
    slug: string;
    description: string;
    budgetMin: number | null;
    budgetMax: number | null;
    budgetType: BudgetType;
    deliveryTime: number | null;
    deliveryUnit: DeliveryUnit;
    city: string;
    province: string;
    priority: RequestPriority;
    status: RequestStatus;
    tags: string[];
    viewCount: number;
    proposalCount: number;
    expiresAt: Date | null;
    categoryId: string | null;
    category: any | null;
    userId: string;
    user: any;
    selectedProposalId: string | null;
    selectedProposal: any | null;
    proposals: any[];
    reviews: any[];
    conversations: any[];
}
