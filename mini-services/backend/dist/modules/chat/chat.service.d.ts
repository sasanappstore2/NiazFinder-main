import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
export declare class ChatService {
    private prisma;
    private readonly logger;
    private redisPublisher;
    constructor(prisma: PrismaService);
    private initRedis;
    private publishToRedis;
    getConversations(userId: string, query: QueryConversationsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    createConversation(userId: string, dto: CreateConversationDto): Promise<{
        id: any;
        requestId: any;
        otherUser: {
            id: any;
            displayName: any;
            avatar: any;
            online: any;
            lastSeenAt: any;
        };
        lastMessage: any;
        lastMessageAt: any;
        createdAt: any;
    }>;
    createOrGetConversation(userId: string, userId2: string, requestId?: string): Promise<{
        id: any;
        requestId: any;
        otherUser: {
            id: any;
            displayName: any;
            avatar: any;
            online: any;
            lastSeenAt: any;
        };
        lastMessage: any;
        lastMessageAt: any;
        createdAt: any;
    }>;
    getMessages(conversationId: string, userId: string, query: QueryMessagesDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    sendMessage(userId: string, conversationId: string, dto: SendMessageDto): Promise<{
        id: any;
        content: any;
        type: any;
        attachmentUrls: any;
        isRead: any;
        createdAt: any;
        sender: {
            id: any;
            displayName: any;
            avatar: any;
        };
        isMine: boolean;
    }>;
    markAsRead(conversationId: string, userId: string, messageIds?: string[]): Promise<{
        count: any;
        message: string;
    }>;
    deleteMessage(messageId: string, userId: string): Promise<{
        message: string;
    }>;
    searchMessages(conversationId: string, userId: string, queryStr: string): Promise<{
        data: any;
        query: string;
        count: any;
    }>;
    getConversationInfo(conversationId: string, userId: string): Promise<{
        id: any;
        requestId: any;
        request: {
            id: string;
            title: string;
            status: string;
        } | null;
        participants: any[];
        otherUser: any;
        unreadCount: any;
        lastMessage: any;
        lastMessageAt: any;
        createdAt: any;
    }>;
    blockUser(userId: string, blockedUserId: string): Promise<{
        message: string;
        blockedUserId: string;
    }>;
    unblockUser(userId: string, blockedUserId: string): Promise<{
        message: string;
        unblockedUserId: string;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: any;
    }>;
    deleteConversation(conversationId: string, userId: string): Promise<{
        message: string;
    }>;
}
