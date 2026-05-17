"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = exports.REDIS_CHANNELS = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
exports.REDIS_CHANNELS = {
    MESSAGES: 'chat:messages',
    PRESENCE: 'chat:presence',
    NOTIFICATIONS: 'notifications',
    REQUESTS: 'requests',
    PROPOSALS: 'proposals',
};
let EventsService = EventsService_1 = class EventsService {
    constructor() {
        this.logger = new common_1.Logger(EventsService_1.name);
        this.redisPublisher = null;
        this.redisSubscriber = null;
        this.messageCallback = null;
        this.presenceCallback = null;
        this.notificationCallback = null;
        this.requestCallback = null;
        this.proposalCallback = null;
        this.socketServer = null;
        this.initRedis();
    }
    async initRedis() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redisPublisher = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                retryStrategy: (times) => Math.min(times * 200, 5000),
            });
            this.redisSubscriber = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                retryStrategy: (times) => Math.min(times * 200, 5000),
            });
            await Promise.all([this.redisPublisher.connect(), this.redisSubscriber.connect()]);
            await this.redisSubscriber.subscribe(exports.REDIS_CHANNELS.MESSAGES, exports.REDIS_CHANNELS.PRESENCE, exports.REDIS_CHANNELS.NOTIFICATIONS, exports.REDIS_CHANNELS.REQUESTS, exports.REDIS_CHANNELS.PROPOSALS);
            this.redisSubscriber.on('message', (channel, message) => {
                this.handleRedisMessage(channel, message);
            });
            this.logger.log('✅ EventsService Redis Pub/Sub connected');
        }
        catch (error) {
            this.logger.warn(`⚠️ EventsService Redis not available, running in single-instance mode: ${error instanceof Error ? error.message : error}`);
            this.redisPublisher = null;
            this.redisSubscriber = null;
        }
    }
    async onModuleInit() {
    }
    async onModuleDestroy() {
        if (this.redisPublisher) {
            await this.redisPublisher.quit().catch(() => { });
        }
        if (this.redisSubscriber) {
            await this.redisSubscriber.quit().catch(() => { });
        }
        this.logger.log('🔌 EventsService Redis connections closed');
    }
    setSocketServer(server) {
        this.socketServer = server;
        this.logger.log('✅ EventsService: Socket.IO server reference set');
    }
    onMessageEvent(callback) {
        this.messageCallback = callback;
    }
    onPresenceEvent(callback) {
        this.presenceCallback = callback;
    }
    onNotificationEvent(callback) {
        this.notificationCallback = callback;
    }
    onRequestEvent(callback) {
        this.requestCallback = callback;
    }
    onProposalEvent(callback) {
        this.proposalCallback = callback;
    }
    handleRedisMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            switch (channel) {
                case exports.REDIS_CHANNELS.MESSAGES:
                    if (this.messageCallback)
                        this.messageCallback(data);
                    this.relayMessageEvent(data);
                    break;
                case exports.REDIS_CHANNELS.PRESENCE:
                    if (this.presenceCallback)
                        this.presenceCallback(data);
                    this.relayPresenceEvent(data);
                    break;
                case exports.REDIS_CHANNELS.NOTIFICATIONS:
                    if (this.notificationCallback)
                        this.notificationCallback(data);
                    this.relayNotificationEvent(data);
                    break;
                case exports.REDIS_CHANNELS.REQUESTS:
                    if (this.requestCallback)
                        this.requestCallback(data);
                    this.relayRequestEvent(data);
                    break;
                case exports.REDIS_CHANNELS.PROPOSALS:
                    if (this.proposalCallback)
                        this.proposalCallback(data);
                    this.relayProposalEvent(data);
                    break;
            }
        }
        catch (error) {
            this.logger.error(`Failed to handle Redis message on ${channel}: ${error}`);
        }
    }
    relayMessageEvent(data) {
        if (!this.socketServer)
            return;
        this.socketServer
            .to(`conversation:${data.conversationId}`)
            .emit('newMessage', data.message);
    }
    relayPresenceEvent(data) {
        if (!this.socketServer)
            return;
        const event = data.online ? 'userOnline' : 'userOffline';
        this.socketServer.emit(event, {
            userId: data.userId,
            lastSeenAt: data.lastSeenAt,
        });
    }
    relayNotificationEvent(data) {
        if (!this.socketServer)
            return;
        if (data.broadcast) {
            this.socketServer.emit('newNotification', data.notification);
        }
        else {
            this.socketServer.to(`user:${data.userId}`).emit('newNotification', data.notification);
        }
    }
    relayRequestEvent(data) {
        if (!this.socketServer)
            return;
        this.socketServer.to(`user:${data.userId}`).emit(data.event, data.payload);
    }
    relayProposalEvent(data) {
        if (!this.socketServer)
            return;
        this.socketServer.to(`user:${data.userId}`).emit(data.event, data.payload);
    }
    async publishMessageEvent(data) {
        if (this.redisPublisher) {
            await this.redisPublisher.publish(exports.REDIS_CHANNELS.MESSAGES, JSON.stringify(data));
        }
        this.relayMessageEvent(data);
    }
    async publishPresenceEvent(data) {
        if (this.redisPublisher) {
            await this.redisPublisher.publish(exports.REDIS_CHANNELS.PRESENCE, JSON.stringify(data));
        }
        this.relayPresenceEvent(data);
    }
    async publishNotificationEvent(data) {
        if (this.redisPublisher) {
            await this.redisPublisher.publish(exports.REDIS_CHANNELS.NOTIFICATIONS, JSON.stringify(data));
        }
        this.relayNotificationEvent(data);
    }
    async publishRequestEvent(data) {
        if (this.redisPublisher) {
            await this.redisPublisher.publish(exports.REDIS_CHANNELS.REQUESTS, JSON.stringify(data));
        }
        this.relayRequestEvent(data);
    }
    async publishProposalEvent(data) {
        if (this.redisPublisher) {
            await this.redisPublisher.publish(exports.REDIS_CHANNELS.PROPOSALS, JSON.stringify(data));
        }
        this.relayProposalEvent(data);
    }
    isRedisConnected() {
        return this.redisPublisher !== null && this.redisSubscriber !== null;
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EventsService);
//# sourceMappingURL=events.service.js.map