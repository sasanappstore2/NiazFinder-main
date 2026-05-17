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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ioredis_1 = require("ioredis");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.redisPublisher = null;
        this.initRedis();
    }
    async initRedis() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redisPublisher = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            await this.redisPublisher.connect();
            this.logger.log('✅ NotificationsService Redis publisher connected');
        }
        catch (error) {
            this.logger.warn(`⚠️ NotificationsService Redis not available: ${error instanceof Error ? error.message : error}`);
            this.redisPublisher = null;
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
    async findAll(userId, query) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = { userId };
        if (query.type) {
            where.type = query.type;
        }
        if (query.isRead !== undefined) {
            where.isRead = query.isRead === 'true';
        }
        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({
                where: { userId, isRead: false },
            }),
        ]);
        return {
            data: notifications.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
                isRead: n.isRead,
                readAt: n.readAt,
                createdAt: n.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        };
    }
    async create(userId, dto) {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                data: dto.data ? JSON.stringify(dto.data) : '{}',
            },
        });
        const notificationPayload = {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: dto.data || {},
            isRead: notification.isRead,
            createdAt: notification.createdAt,
        };
        await this.publishToRedis('notifications', {
            userId,
            notification: notificationPayload,
        });
        return notificationPayload;
    }
    async markAsRead(userId, notificationId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('اعلان یافت نشد');
        }
        if (notification.userId !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این اعلان را ندارید');
        }
        const now = new Date();
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true, readAt: now },
        });
        return {
            message: 'اعلان به عنوان خوانده شده علامت‌گذاری شد',
        };
    }
    async markAllAsRead(userId) {
        const now = new Date();
        const result = await this.prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: now,
            },
        });
        return {
            count: result.count,
            message: `${result.count} اعلان به عنوان خوانده شده علامت‌گذاری شد`,
        };
    }
    async delete(userId, notificationId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('اعلان یافت نشد');
        }
        if (notification.userId !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این اعلان را ندارید');
        }
        await this.prisma.notification.delete({
            where: { id: notificationId },
        });
        return {
            message: 'اعلان با موفقیت حذف شد',
        };
    }
    async deleteAll(userId) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId },
        });
        return {
            count: result.count,
            message: `${result.count} اعلان با موفقیت حذف شد`,
        };
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });
        return {
            count,
        };
    }
    async sendPush(userId, notification) {
        const created = await this.prisma.notification.create({
            data: {
                userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data ? JSON.stringify(notification.data) : '{}',
            },
        });
        const payload = {
            id: created.id,
            type: created.type,
            title: created.title,
            message: created.message,
            data: notification.data || {},
            isRead: created.isRead,
            createdAt: created.createdAt,
        };
        await this.publishToRedis('notifications', {
            userId,
            notification: payload,
        });
        return payload;
    }
    async broadcast(dto) {
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                isBanned: false,
            },
            select: { id: true },
        });
        const dataStr = dto.data ? JSON.stringify(dto.data) : '{}';
        const batchSize = 100;
        let totalCreated = 0;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            const notifications = batch.map((user) => ({
                userId: user.id,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                data: dataStr,
            }));
            const result = await this.prisma.notification.createMany({
                data: notifications,
            });
            totalCreated += result.count;
        }
        await this.publishToRedis('notifications', {
            broadcast: true,
            notification: {
                type: dto.type,
                title: dto.title,
                message: dto.message,
                data: dto.data || {},
            },
        });
        return {
            count: totalCreated,
            message: `اعلان برای ${totalCreated} کاربر ارسال شد`,
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map