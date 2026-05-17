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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(ChatGateway_1.name);
        this.connectedClients = new Map();
        this.rateLimiter = new Map();
        this.RATE_LIMIT_MAX = 30;
        this.RATE_LIMIT_WINDOW_MS = 60_000;
        this.redisPublisher = null;
        this.redisSubscriber = null;
        this.REDIS_CHANNELS = {
            MESSAGES: 'chat:messages',
            PRESENCE: 'chat:presence',
            NOTIFICATIONS: 'notifications',
            REQUESTS: 'requests',
            PROPOSALS: 'proposals',
        };
        this.initRedis();
    }
    async initRedis() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redisPublisher = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            this.redisSubscriber = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            await Promise.all([this.redisPublisher.connect(), this.redisSubscriber.connect()]);
            await this.redisSubscriber.subscribe(this.REDIS_CHANNELS.MESSAGES, this.REDIS_CHANNELS.PRESENCE, this.REDIS_CHANNELS.NOTIFICATIONS, this.REDIS_CHANNELS.REQUESTS, this.REDIS_CHANNELS.PROPOSALS);
            this.redisSubscriber.on('message', (channel, message) => {
                this.handleRedisMessage(channel, message);
            });
            this.logger.log('✅ Redis Pub/Sub connected for chat gateway');
        }
        catch (error) {
            this.logger.warn(`⚠️ Redis not available, running in single-instance mode: ${error instanceof Error ? error.message : error}`);
            this.redisPublisher = null;
            this.redisSubscriber = null;
        }
    }
    async handleRedisMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            switch (channel) {
                case this.REDIS_CHANNELS.MESSAGES:
                    this.handleCrossInstanceMessage(data);
                    break;
                case this.REDIS_CHANNELS.PRESENCE:
                    this.handleCrossInstancePresence(data);
                    break;
                case this.REDIS_CHANNELS.NOTIFICATIONS:
                    this.handleCrossInstanceNotification(data);
                    break;
                case this.REDIS_CHANNELS.REQUESTS:
                    this.handleCrossInstanceRequest(data);
                    break;
                case this.REDIS_CHANNELS.PROPOSALS:
                    this.handleCrossInstanceProposal(data);
                    break;
            }
        }
        catch (error) {
            this.logger.error(`Failed to handle Redis message on ${channel}: ${error}`);
        }
    }
    handleCrossInstanceMessage(data) {
        const { conversationId, senderId, message } = data;
        this.server
            .to(`conversation:${conversationId}`)
            .except(Array.from(this.getUserSocketIds(senderId)))
            .emit('newMessage', message);
    }
    handleCrossInstancePresence(data) {
        const { userId, online, lastSeenAt } = data;
        if (online) {
            this.emitToAllUserConversations(userId, 'userOnline', {
                userId,
                lastSeenAt,
            });
        }
        else {
            this.emitToAllUserConversations(userId, 'userOffline', {
                userId,
                lastSeenAt,
            });
        }
    }
    handleCrossInstanceNotification(data) {
        const { userId, notification } = data;
        this.server.to(`user:${userId}`).emit('newNotification', notification);
    }
    handleCrossInstanceRequest(data) {
        const { userId, event, payload } = data;
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    handleCrossInstanceProposal(data) {
        const { userId, event, payload } = data;
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    getUserSocketIds(userId) {
        return this.connectedClients.get(userId) || new Set();
    }
    async emitToAllUserConversations(userId, event, payload) {
        const conversations = await this.prisma.conversation.findMany({
            where: { OR: [{ userId1: userId }, { userId2: userId }] },
            select: { id: true },
        });
        for (const conv of conversations) {
            this.server.to(`conversation:${conv.id}`).emit(event, payload);
        }
    }
    async publishToRedis(channel, data) {
        if (this.redisPublisher) {
            try {
                await this.redisPublisher.publish(channel, JSON.stringify(data));
            }
            catch (error) {
                this.logger.error(`Failed to publish to Redis channel ${channel}: ${error}`);
            }
        }
    }
    checkRateLimit(userId) {
        const now = Date.now();
        const entry = this.rateLimiter.get(userId);
        if (!entry || now >= entry.resetAt) {
            this.rateLimiter.set(userId, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
            return true;
        }
        if (entry.count >= this.RATE_LIMIT_MAX) {
            return false;
        }
        entry.count++;
        return true;
    }
    formatMessage(message, userId) {
        return {
            id: message.id,
            content: message.content,
            type: message.type,
            attachmentUrls: message.attachmentUrls,
            isRead: message.isRead,
            readAt: message.readAt,
            createdAt: message.createdAt,
            sender: message.senderId === 'SYSTEM'
                ? null
                : {
                    id: message.sender?.id || message.senderId,
                    displayName: message.sender?.displayName ||
                        `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim(),
                    avatar: message.sender?.avatar,
                },
            isMine: message.senderId === userId,
        };
    }
    async handleConnection(client) {
        try {
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                this.logger.warn(`Connection rejected: no token provided for socket ${client.id}`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
            });
            const authToken = await this.prisma.authToken.findFirst({
                where: { userId: payload.sub, token },
                include: { user: { select: { id: true, isActive: true, isBanned: true } } },
            });
            if (!authToken) {
                this.logger.warn(`Connection rejected: invalid token for socket ${client.id}`);
                client.disconnect();
                return;
            }
            if (authToken.expiresAt < new Date()) {
                this.logger.warn(`Connection rejected: expired token for socket ${client.id}`);
                client.disconnect();
                return;
            }
            const user = authToken.user;
            if (!user.isActive || user.isBanned) {
                this.logger.warn(`Connection rejected: user ${user.id} is inactive/banned`);
                client.disconnect();
                return;
            }
            client.data.userId = user.id;
            client.data.user = payload;
            if (!this.connectedClients.has(user.id)) {
                this.connectedClients.set(user.id, new Set());
            }
            this.connectedClients.get(user.id).add(client.id);
            await client.join(`user:${user.id}`);
            await this.prisma.user.update({
                where: { id: user.id },
                data: { online: true, lastSeenAt: new Date() },
            });
            this.emitToAllUserConversations(user.id, 'userOnline', {
                userId: user.id,
                lastSeenAt: new Date().toISOString(),
            });
            await this.publishToRedis(this.REDIS_CHANNELS.PRESENCE, {
                userId: user.id,
                online: true,
                lastSeenAt: new Date().toISOString(),
            });
            this.logger.log(`User ${user.id} connected (socket ${client.id})`);
        }
        catch (error) {
            this.logger.warn(`Connection rejected: authentication failed for socket ${client.id}: ${error instanceof Error ? error.message : error}`);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const userId = client.data?.userId;
        if (userId) {
            const userSockets = this.connectedClients.get(userId);
            if (userSockets) {
                userSockets.delete(client.id);
                if (userSockets.size === 0) {
                    this.connectedClients.delete(userId);
                    const now = new Date();
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { online: false, lastSeenAt: now },
                    });
                    this.emitToAllUserConversations(userId, 'userOffline', {
                        userId,
                        lastSeenAt: now.toISOString(),
                    });
                    await this.publishToRedis(this.REDIS_CHANNELS.PRESENCE, {
                        userId,
                        online: false,
                        lastSeenAt: now.toISOString(),
                    });
                }
            }
            const rooms = Array.from(client.rooms);
            for (const room of rooms) {
                if (room !== client.id) {
                    await client.leave(room);
                }
            }
            this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
        }
    }
    async handleJoinConversation(client, data) {
        const { userId } = client.data;
        const { conversationId } = data;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            client.emit('error', { message: 'مکالمه یافت نشد' });
            return;
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            client.emit('error', { message: 'شما دسترسی به این مکالمه را ندارید' });
            return;
        }
        await client.join(`conversation:${conversationId}`);
        const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
        const otherUserOnline = this.connectedClients.has(otherUserId);
        client.emit('conversationJoined', {
            conversationId,
            participants: [
                { userId, online: true },
                { userId: otherUserId, online: otherUserOnline },
            ],
        });
        this.logger.log(`User ${userId} joined conversation ${conversationId}`);
    }
    async handleLeaveConversation(client, data) {
        await client.leave(`conversation:${data.conversationId}`);
        this.logger.log(`User ${client.data.userId} left conversation ${data.conversationId}`);
    }
    async handleSendMessage(client, data) {
        const { userId } = client.data;
        const { conversationId, content, type, fileUrl, fileName, fileSize } = data;
        if (!content || content.trim().length === 0) {
            client.emit('error', { message: 'محتوای پیام نمی‌تواند خالی باشد' });
            return;
        }
        if (content.length > 10000) {
            client.emit('error', { message: 'محتوای پیام حداکثر ۱۰,۰۰۰ کاراکتر می‌تواند باشد' });
            return;
        }
        if (!this.checkRateLimit(userId)) {
            client.emit('error', { message: 'محدودیت ارسال پیام: حداکثر ۳۰ پیام در دقیقه' });
            return;
        }
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            client.emit('error', { message: 'مکالمه یافت نشد' });
            return;
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            client.emit('error', { message: 'شما دسترسی به این مکالمه را ندارید' });
            return;
        }
        const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
        const isBlocked = await this.prisma.message.count({
            where: {
                conversationId,
                type: 'SYSTEM_BLOCKED',
            },
        });
        const attachmentUrls = fileUrl ? JSON.stringify([fileUrl]) : '[]';
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content: content.trim(),
                type: type || 'TEXT',
                attachmentUrls,
            },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
                },
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: content.trim().substring(0, 200),
                lastMessageAt: new Date(),
            },
        });
        const formattedMessage = this.formatMessage(message, userId);
        this.server.to(`conversation:${conversationId}`).emit('newMessage', formattedMessage);
        await this.publishToRedis(this.REDIS_CHANNELS.MESSAGES, {
            conversationId,
            senderId: userId,
            message: formattedMessage,
        });
        await this.prisma.notification.create({
            data: {
                userId: otherUserId,
                type: 'NEW_MESSAGE',
                title: 'پیام جدید',
                message: content.trim().substring(0, 100),
                data: JSON.stringify({
                    conversationId,
                    messageId: message.id,
                    senderId: userId,
                }),
            },
        });
        this.server.to(`user:${otherUserId}`).emit('newNotification', {
            type: 'NEW_MESSAGE',
            conversationId,
            senderId: userId,
        });
        await this.publishToRedis(this.REDIS_CHANNELS.NOTIFICATIONS, {
            userId: otherUserId,
            notification: {
                type: 'NEW_MESSAGE',
                conversationId,
                senderId: userId,
            },
        });
    }
    async handleTyping(client, data) {
        const { userId } = client.data;
        const { conversationId } = data;
        client.to(`conversation:${conversationId}`).emit('userTyping', {
            userId,
            conversationId,
        });
    }
    async handleStopTyping(client, data) {
        const { userId } = client.data;
        const { conversationId } = data;
        client.to(`conversation:${conversationId}`).emit('userStopTyping', {
            userId,
            conversationId,
        });
    }
    async handleMarkAsRead(client, data) {
        const { userId } = client.data;
        const { conversationId, messageIds } = data;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation)
            return;
        if (conversation.userId1 !== userId && conversation.userId2 !== userId)
            return;
        const now = new Date();
        if (messageIds && messageIds.length > 0) {
            await this.prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    conversationId,
                    senderId: { not: userId },
                    isRead: false,
                },
                data: { isRead: true, readAt: now },
            });
        }
        else {
            await this.prisma.message.updateMany({
                where: {
                    conversationId,
                    senderId: { not: userId },
                    isRead: false,
                },
                data: { isRead: true, readAt: now },
            });
        }
        const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
        this.server.to(`user:${otherUserId}`).emit('messagesRead', {
            conversationId,
            readBy: userId,
            messageIds,
            timestamp: now.toISOString(),
        });
    }
    async handleMessageSeen(client, data) {
        const { userId } = client.data;
        const { messageId, conversationId } = data;
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true },
        });
        if (!message)
            return;
        const now = new Date();
        await this.prisma.message.update({
            where: { id: messageId },
            data: { isRead: true, readAt: now },
        });
        this.server.to(`user:${message.senderId}`).emit('messageSeen', {
            messageId,
            conversationId,
            seenBy: userId,
            timestamp: now.toISOString(),
        });
    }
    async handleGetOnlineStatus(client, data) {
        const statusMap = {};
        for (const uid of data.userIds) {
            statusMap[uid] = this.connectedClients.has(uid);
        }
        client.emit('onlineStatus', statusMap);
    }
    broadcastPresence() {
        const onlineUsers = Array.from(this.connectedClients.keys());
        this.server.emit('presence', { onlineUsers, count: onlineUsers.length });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_b = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _b : Object)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinConversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveConversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stopTyping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleStopTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('markAsRead'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkAsRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('messageSeen'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessageSeen", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getOnlineStatus'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleGetOnlineStatus", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, prisma_service_1.PrismaService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map