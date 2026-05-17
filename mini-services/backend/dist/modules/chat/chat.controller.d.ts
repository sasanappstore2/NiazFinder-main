import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getConversations(user: any, query: QueryConversationsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    createConversation(user: any, dto: CreateConversationDto): Promise<{
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
    getConversationInfo(user: any, id: string): Promise<{
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
    deleteConversation(user: any, id: string): Promise<{
        message: string;
    }>;
    getMessages(user: any, id: string, query: QueryMessagesDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    sendMessage(user: any, id: string, dto: SendMessageDto): Promise<{
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
    markAsRead(user: any, id: string): Promise<{
        count: any;
        message: string;
    }>;
    deleteMessage(user: any, id: string): Promise<{
        message: string;
    }>;
    searchMessages(user: any, conversationId: string, query: string): Promise<{
        data: any;
        query: string;
        count: any;
    }>;
    getUnreadCount(user: any): Promise<{
        count: any;
    }>;
}
