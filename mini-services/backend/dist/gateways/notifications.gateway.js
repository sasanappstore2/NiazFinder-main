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
var NotificationsGateway_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    constructor() {
        this.logger = new common_1.Logger(NotificationsGateway_1.name);
    }
    afterInit(server) {
        this.logger.log('WebSocket Notifications Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const { JwtService } = await Promise.resolve().then(() => require('@nestjs/jwt'));
            const jwtService = new JwtService({
                secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-2024-production-key',
            });
            const payload = jwtService.verify(token);
            client.data.user = { id: payload.sub, email: payload.email, role: payload.role };
            client.join(`user:${payload.sub}`);
            this.logger.log(`Notification client connected: ${payload.sub}`);
        }
        catch {
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const user = client.data.user;
        if (user) {
            this.logger.log(`Notification client disconnected: ${user.id}`);
        }
    }
    async sendToUser(userId, notification) {
        this.server.to(`user:${userId}`).emit('notification:new', notification);
    }
    async broadcast(event, data) {
        this.server.emit(event, data);
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:3000', '*'],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        namespace: '/notifications',
    })
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map