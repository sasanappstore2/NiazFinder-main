import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
export interface MessageEventData {
    conversationId: string;
    senderId: string;
    message: any;
}
export interface PresenceEventData {
    userId: string;
    online: boolean;
    lastSeenAt: string;
}
export interface NotificationEventData {
    userId: string;
    notification: any;
    broadcast?: boolean;
}
export interface RequestEventData {
    userId: string;
    event: string;
    payload: any;
}
export interface ProposalEventData {
    userId: string;
    event: string;
    payload: any;
}
export declare const REDIS_CHANNELS: {
    readonly MESSAGES: "chat:messages";
    readonly PRESENCE: "chat:presence";
    readonly NOTIFICATIONS: "notifications";
    readonly REQUESTS: "requests";
    readonly PROPOSALS: "proposals";
};
export declare class EventsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private redisPublisher;
    private redisSubscriber;
    private messageCallback;
    private presenceCallback;
    private notificationCallback;
    private requestCallback;
    private proposalCallback;
    private socketServer;
    constructor();
    private initRedis;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    setSocketServer(server: Server): void;
    onMessageEvent(callback: (data: MessageEventData) => void): void;
    onPresenceEvent(callback: (data: PresenceEventData) => void): void;
    onNotificationEvent(callback: (data: NotificationEventData) => void): void;
    onRequestEvent(callback: (data: RequestEventData) => void): void;
    onProposalEvent(callback: (data: ProposalEventData) => void): void;
    private handleRedisMessage;
    private relayMessageEvent;
    private relayPresenceEvent;
    private relayNotificationEvent;
    private relayRequestEvent;
    private relayProposalEvent;
    publishMessageEvent(data: MessageEventData): Promise<void>;
    publishPresenceEvent(data: PresenceEventData): Promise<void>;
    publishNotificationEvent(data: NotificationEventData): Promise<void>;
    publishRequestEvent(data: RequestEventData): Promise<void>;
    publishProposalEvent(data: ProposalEventData): Promise<void>;
    isRedisConnected(): boolean;
}
