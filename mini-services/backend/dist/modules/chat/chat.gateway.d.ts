import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        user?: any;
    };
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly prisma;
    private readonly logger;
    server: Server;
    private connectedClients;
    private rateLimiter;
    private readonly RATE_LIMIT_MAX;
    private readonly RATE_LIMIT_WINDOW_MS;
    private redisPublisher;
    private redisSubscriber;
    private readonly REDIS_CHANNELS;
    constructor(jwtService: JwtService, prisma: PrismaService);
    private initRedis;
    private handleRedisMessage;
    private handleCrossInstanceMessage;
    private handleCrossInstancePresence;
    private handleCrossInstanceNotification;
    private handleCrossInstanceRequest;
    private handleCrossInstanceProposal;
    private getUserSocketIds;
    private emitToAllUserConversations;
    private publishToRedis;
    private checkRateLimit;
    private formatMessage;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleLeaveConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleSendMessage(client: AuthenticatedSocket, data: {
        conversationId: string;
        content: string;
        type?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
    }): Promise<void>;
    handleTyping(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleStopTyping(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleMarkAsRead(client: AuthenticatedSocket, data: {
        conversationId: string;
        messageIds?: string[];
    }): Promise<void>;
    handleMessageSeen(client: AuthenticatedSocket, data: {
        messageId: string;
        conversationId: string;
    }): Promise<void>;
    handleGetOnlineStatus(client: AuthenticatedSocket, data: {
        userIds: string[];
    }): Promise<void>;
    broadcastPresence(): void;
}
export {};
