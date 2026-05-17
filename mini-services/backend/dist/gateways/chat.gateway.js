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
var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const redis_service_1 = require("../common/redis/redis.service");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    constructor(jwtService, redis) {
        this.jwtService = jwtService;
        this.redis = redis;
        this.logger = new common_1.Logger(ChatGateway_1.name);
        this.connectedUsers = new Map();
        this.setupRedisPubSub();
    }
    async setupRedisPubSub() {
        try {
            await this.redis.subscribe('ws:chat', (message) => {
                if (message?.event && message?.payload) {
                    this.server.emit(message.event, message.payload);
                }
            });
            this.logger.log('Redis pub/sub enabled for WebSocket scaling');
        }
        catch (err) {
            this.logger.warn(`Redis pub/sub setup failed: ${err.message}`);
        }
    }
    afterInit(server) {
        this.logger.log('WebSocket Chat Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                this.logger.warn(`Connection rejected: no token provided (socket: ${client.id})`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-2024-production-key',
            });
            client.data.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };
            const userId = payload.sub;
            if (!this.connectedUsers.has(userId)) {
                this.connectedUsers.set(userId, new Set());
            }
            this.connectedUsers.get(userId).add(client.id);
            client.join(`user:${userId}`);
            this.logger.log(`User ${userId} connected (${client.id})`);
        }
        catch (error) {
            this.logger.warn(`Connection rejected: invalid token (socket: ${client.id})`);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const user = client.data.user;
        if (user) {
            const sockets = this.connectedUsers.get(user.id);
            if (sockets) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.connectedUsers.delete(user.id);
                    this.server.emit('user:offline', { userId: user.id });
                }
            }
            this.logger.log(`User ${user.id} disconnected (${client.id})`);
        }
    }
    async handleMessage(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        const message = {
            id: crypto.randomUUID(),
            conversationId: data.conversationId,
            content: data.content,
            type: data.type || 'TEXT',
            senderId: user.id,
            createdAt: new Date().toISOString(),
        };
        this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);
        await this.redis.publish('ws:chat', {
            event: 'message:new',
            payload: message,
        });
        return message;
    }
    async handleJoinConversation(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        client.join(`conversation:${data.conversationId}`);
        this.logger.log(`User ${user.id} joined conversation ${data.conversationId}`);
        return { success: true, conversationId: data.conversationId };
    }
    async handleLeaveConversation(data, client) {
        client.leave(`conversation:${data.conversationId}`);
        return { success: true, conversationId: data.conversationId };
    }
    async handleTypingStart(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        client.to(`conversation:${data.conversationId}`).emit('typing:start', {
            userId: user.id,
            conversationId: data.conversationId,
        });
    }
    async handleTypingStop(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
            userId: user.id,
            conversationId: data.conversationId,
        });
    }
    isUserOnline(userId) {
        const sockets = this.connectedUsers.get(userId);
        return sockets !== undefined && sockets.size > 0;
    }
    getOnlineStatus(userIds) {
        const result = {};
        for (const userId of userIds) {
            result[userId] = this.isUserOnline(userId);
        }
        return result;
    }
    async sendToUser(userId, event, data) {
        this.server.to(`user:${userId}`).emit(event, data);
        await this.redis.publish('ws:chat', {
            event,
            payload: data,
            targetUserId: userId,
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_b = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _b : Object)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:send'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_c = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:leave'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_e = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _e : Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:start'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_f = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _f : Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:stop'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_g = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _g : Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStop", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:3000', '*'],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, redis_service_1.RedisService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map