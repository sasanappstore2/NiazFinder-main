import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// ─── Event Types ─────────────────────────────────────────────────────────────

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

// ─── Redis Channels ──────────────────────────────────────────────────────────

export const REDIS_CHANNELS = {
  MESSAGES: 'chat:messages',
  PRESENCE: 'chat:presence',
  NOTIFICATIONS: 'notifications',
  REQUESTS: 'requests',
  PROPOSALS: 'proposals',
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  private redisPublisher: Redis | null = null;
  private redisSubscriber: Redis | null = null;

  /** Callbacks for handling events from other instances */
  private messageCallback: ((data: MessageEventData) => void) | null = null;
  private presenceCallback: ((data: PresenceEventData) => void) | null = null;
  private notificationCallback: ((data: NotificationEventData) => void) | null = null;
  private requestCallback: ((data: RequestEventData) => void) | null = null;
  private proposalCallback: ((data: ProposalEventData) => void) | null = null;

  /** Reference to the Socket.IO server (set by ChatGateway on init) */
  private socketServer: Server | null = null;

  constructor() {
    this.initRedis();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });

      this.redisSubscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });

      await Promise.all([this.redisPublisher.connect(), this.redisSubscriber.connect()]);

      // Subscribe to all channels
      await this.redisSubscriber.subscribe(
        REDIS_CHANNELS.MESSAGES,
        REDIS_CHANNELS.PRESENCE,
        REDIS_CHANNELS.NOTIFICATIONS,
        REDIS_CHANNELS.REQUESTS,
        REDIS_CHANNELS.PROPOSALS,
      );

      this.redisSubscriber.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });

      this.logger.log('✅ EventsService Redis Pub/Sub connected');
    } catch (error) {
      this.logger.warn(
        `⚠️ EventsService Redis not available, running in single-instance mode: ${error instanceof Error ? error.message : error}`,
      );
      this.redisPublisher = null;
      this.redisSubscriber = null;
    }
  }

  async onModuleInit() {
    // Redis already initialized in constructor
  }

  async onModuleDestroy() {
    if (this.redisPublisher) {
      await this.redisPublisher.quit().catch(() => {});
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit().catch(() => {});
    }
    this.logger.log('🔌 EventsService Redis connections closed');
  }

  // ─── Set Socket Server Reference ───────────────────────────────────────

  setSocketServer(server: Server) {
    this.socketServer = server;
    this.logger.log('✅ EventsService: Socket.IO server reference set');
  }

  // ─── Register Callbacks ────────────────────────────────────────────────

  onMessageEvent(callback: (data: MessageEventData) => void) {
    this.messageCallback = callback;
  }

  onPresenceEvent(callback: (data: PresenceEventData) => void) {
    this.presenceCallback = callback;
  }

  onNotificationEvent(callback: (data: NotificationEventData) => void) {
    this.notificationCallback = callback;
  }

  onRequestEvent(callback: (data: RequestEventData) => void) {
    this.requestCallback = callback;
  }

  onProposalEvent(callback: (data: ProposalEventData) => void) {
    this.proposalCallback = callback;
  }

  // ─── Redis Message Handler ─────────────────────────────────────────────

  private handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNELS.MESSAGES:
          if (this.messageCallback) this.messageCallback(data);
          // Also relay to local WebSocket clients
          this.relayMessageEvent(data);
          break;
        case REDIS_CHANNELS.PRESENCE:
          if (this.presenceCallback) this.presenceCallback(data);
          this.relayPresenceEvent(data);
          break;
        case REDIS_CHANNELS.NOTIFICATIONS:
          if (this.notificationCallback) this.notificationCallback(data);
          this.relayNotificationEvent(data);
          break;
        case REDIS_CHANNELS.REQUESTS:
          if (this.requestCallback) this.requestCallback(data);
          this.relayRequestEvent(data);
          break;
        case REDIS_CHANNELS.PROPOSALS:
          if (this.proposalCallback) this.proposalCallback(data);
          this.relayProposalEvent(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle Redis message on ${channel}: ${error}`);
    }
  }

  // ─── Relay to WebSocket Clients ────────────────────────────────────────

  private relayMessageEvent(data: MessageEventData) {
    if (!this.socketServer) return;
    this.socketServer
      .to(`conversation:${data.conversationId}`)
      .emit('newMessage', data.message);
  }

  private relayPresenceEvent(data: PresenceEventData) {
    if (!this.socketServer) return;
    const event = data.online ? 'userOnline' : 'userOffline';
    this.socketServer.emit(event, {
      userId: data.userId,
      lastSeenAt: data.lastSeenAt,
    });
  }

  private relayNotificationEvent(data: NotificationEventData) {
    if (!this.socketServer) return;
    if (data.broadcast) {
      this.socketServer.emit('newNotification', data.notification);
    } else {
      this.socketServer.to(`user:${data.userId}`).emit('newNotification', data.notification);
    }
  }

  private relayRequestEvent(data: RequestEventData) {
    if (!this.socketServer) return;
    this.socketServer.to(`user:${data.userId}`).emit(data.event, data.payload);
  }

  private relayProposalEvent(data: ProposalEventData) {
    if (!this.socketServer) return;
    this.socketServer.to(`user:${data.userId}`).emit(data.event, data.payload);
  }

  // ─── Publish Events ────────────────────────────────────────────────────

  /**
   * Publish a new message event to all instances via Redis.
   * Event will be relayed to WebSocket clients in the conversation room.
   */
  async publishMessageEvent(data: MessageEventData) {
    if (this.redisPublisher) {
      await this.redisPublisher.publish(REDIS_CHANNELS.MESSAGES, JSON.stringify(data));
    }
    // Also relay locally
    this.relayMessageEvent(data);
  }

  /**
   * Publish a user presence change event (online/offline).
   * Event will be relayed to all relevant conversation rooms.
   */
  async publishPresenceEvent(data: PresenceEventData) {
    if (this.redisPublisher) {
      await this.redisPublisher.publish(REDIS_CHANNELS.PRESENCE, JSON.stringify(data));
    }
    this.relayPresenceEvent(data);
  }

  /**
   * Publish a notification event for a specific user.
   * Event will be relayed to the user's personal room.
   */
  async publishNotificationEvent(data: NotificationEventData) {
    if (this.redisPublisher) {
      await this.redisPublisher.publish(REDIS_CHANNELS.NOTIFICATIONS, JSON.stringify(data));
    }
    this.relayNotificationEvent(data);
  }

  /**
   * Publish a request-related event (status change, new request, etc.).
   * Event will be relayed to the specific user's personal room.
   */
  async publishRequestEvent(data: RequestEventData) {
    if (this.redisPublisher) {
      await this.redisPublisher.publish(REDIS_CHANNELS.REQUESTS, JSON.stringify(data));
    }
    this.relayRequestEvent(data);
  }

  /**
   * Publish a proposal-related event (new proposal, accepted, rejected, etc.).
   * Event will be relayed to the specific user's personal room.
   */
  async publishProposalEvent(data: ProposalEventData) {
    if (this.redisPublisher) {
      await this.redisPublisher.publish(REDIS_CHANNELS.PROPOSALS, JSON.stringify(data));
    }
    this.relayProposalEvent(data);
  }

  // ─── Health Check ──────────────────────────────────────────────────────

  isRedisConnected(): boolean {
    return this.redisPublisher !== null && this.redisSubscriber !== null;
  }
}
