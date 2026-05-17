import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/redis/redis.service';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private redis;
    server: Server;
    private readonly logger;
    private connectedUsers;
    constructor(jwtService: JwtService, redis: RedisService);
    private setupRedisPubSub;
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleMessage(data: {
        conversationId: string;
        content: string;
        type?: string;
    }, client: Socket): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        conversationId: string;
        content: string;
        type: string;
        senderId: any;
        createdAt: string;
    } | undefined>;
    handleJoinConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        conversationId: string;
    } | undefined>;
    handleLeaveConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        conversationId: string;
    }>;
    handleTypingStart(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    handleTypingStop(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    isUserOnline(userId: string): boolean;
    getOnlineStatus(userIds: string[]): Record<string, boolean>;
    sendToUser(userId: string, event: string, data: unknown): Promise<void>;
}
