import { BaseEntity } from './base.entity';
export declare enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    FILE = "FILE",
    AUDIO = "AUDIO",
    SYSTEM_BLOCKED = "SYSTEM_BLOCKED"
}
export declare class Message extends BaseEntity {
    content: string;
    type: MessageType;
    senderId: string;
    sender: any;
    conversationId: string;
    conversation: any;
    isRead: boolean;
    readBy: string[];
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    metadata: Record<string, unknown>;
}
