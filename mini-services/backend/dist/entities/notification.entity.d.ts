import { BaseEntity } from './base.entity';
export declare enum NotificationType {
    MESSAGE = "MESSAGE",
    PROPOSAL = "PROPOSAL",
    REVIEW = "REVIEW",
    PAYMENT = "PAYMENT",
    SYSTEM = "SYSTEM",
    ACHIEVEMENT = "ACHIEVEMENT"
}
export declare class Notification extends BaseEntity {
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, unknown>;
    userId: string;
    user: any;
    isRead: boolean;
    readAt: Date | null;
}
