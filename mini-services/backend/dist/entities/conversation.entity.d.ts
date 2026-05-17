import { BaseEntity } from './base.entity';
export declare class Conversation extends BaseEntity {
    requestId: string | null;
    request: any | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCounts: Record<string, number>;
    participants: any[];
    messages: any[];
}
