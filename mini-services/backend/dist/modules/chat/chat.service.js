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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ioredis_1 = require("ioredis");
let ChatService = ChatService_1 = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ChatService_1.name);
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
            this.logger.log('✅ ChatService Redis publisher connected');
        }
        catch (error) {
            this.logger.warn(`⚠️ ChatService Redis not available: ${error instanceof Error ? error.message : error}`);
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
    async getConversations(userId, query) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [{ userId1: userId }, { userId2: userId }],
            },
            include: {
                user1: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
                user2: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
                messages: {
                    where: { isRead: false, senderId: { not: userId } },
                    select: { id: true },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
            skip,
            take: limit,
        });
        const total = await this.prisma.conversation.count({
            where: {
                OR: [{ userId1: userId }, { userId2: userId }],
            },
        });
        const result = conversations.map((conv) => {
            const isUser1 = conv.userId1 === userId;
            const otherUser = isUser1 ? conv.user2 : conv.user1;
            const unreadCount = conv.messages.length;
            return {
                id: conv.id,
                requestId: conv.requestId,
                otherUser: {
                    id: otherUser.id,
                    displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
                    avatar: otherUser.avatar,
                    online: otherUser.online,
                    lastSeenAt: otherUser.lastSeenAt,
                },
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
                createdAt: conv.createdAt,
            };
        });
        return {
            data: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createConversation(userId, dto) {
        const otherUserId = dto.otherUserId || dto.userId2;
        if (!otherUserId) {
            throw new common_1.BadRequestException('شناسه کاربر مقابل الزامی است');
        }
        if (userId === otherUserId) {
            throw new common_1.BadRequestException('نمی‌توانید با خودتان مکالمه ایجاد کنید');
        }
        const existingBlock = await this.prisma.message.count({
            where: {
                conversation: {
                    OR: [
                        { userId1: userId, userId2: otherUserId },
                        { userId1: otherUserId, userId2: userId },
                    ],
                },
                type: 'SYSTEM_BLOCKED',
            },
        });
        if (existingBlock > 0) {
            throw new common_1.ForbiddenException('شما نمی‌توانید با این کاربر مکالمه ایجاد کنید');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: otherUserId },
            select: { id: true, isActive: true, isBanned: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('کاربر مورد نظر یافت نشد');
        }
        if (!targetUser.isActive || targetUser.isBanned) {
            throw new common_1.BadRequestException('کاربر مورد نظر در دسترس نیست');
        }
        const requestId = dto.requestId;
        if (requestId) {
            const request = await this.prisma.serviceRequest.findUnique({
                where: { id: requestId },
                select: { id: true },
            });
            if (!request) {
                throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
            }
        }
        const existing = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { userId1: userId, userId2: otherUserId, requestId: requestId || null },
                    { userId1: otherUserId, userId2: userId, requestId: requestId || null },
                ],
            },
            include: {
                user1: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
                user2: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
            },
        });
        if (existing) {
            const isUser1 = existing.userId1 === userId;
            const otherUser = isUser1 ? existing.user2 : existing.user1;
            return {
                id: existing.id,
                requestId: existing.requestId,
                otherUser: {
                    id: otherUser.id,
                    displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
                    avatar: otherUser.avatar,
                    online: otherUser.online,
                    lastSeenAt: otherUser.lastSeenAt,
                },
                lastMessage: existing.lastMessage,
                lastMessageAt: existing.lastMessageAt,
                createdAt: existing.createdAt,
            };
        }
        const conversation = await this.prisma.conversation.create({
            data: {
                userId1: userId,
                userId2: otherUserId,
                requestId: requestId || null,
                lastMessage: 'مکالمه شروع شد',
                lastMessageAt: new Date(),
                messages: {
                    create: {
                        senderId: 'SYSTEM',
                        content: requestId ? 'مکالمه در خصوص درخواست خدمات شروع شد' : 'مکالمه شروع شد',
                        type: 'SYSTEM',
                        isRead: true,
                        readAt: new Date(),
                    },
                },
            },
            include: {
                user1: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
                user2: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true },
                },
            },
        });
        const isUser1 = conversation.userId1 === userId;
        const otherUser = isUser1 ? conversation.user2 : conversation.user1;
        return {
            id: conversation.id,
            requestId: conversation.requestId,
            otherUser: {
                id: otherUser.id,
                displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
                avatar: otherUser.avatar,
                online: otherUser.online,
                lastSeenAt: otherUser.lastSeenAt,
            },
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            createdAt: conversation.createdAt,
        };
    }
    async createOrGetConversation(userId, userId2, requestId) {
        return this.createConversation(userId, { userId2, requestId });
    }
    async getMessages(conversationId, userId, query) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        const page = query.page || 1;
        const limit = Math.min(query.limit || 50, 200);
        const skip = (page - 1) * limit;
        const whereClause = { conversationId };
        if (query.before) {
            const beforeDate = new Date(query.before);
            if (!isNaN(beforeDate.getTime())) {
                whereClause.createdAt = { lt: beforeDate };
            }
        }
        const [messages, total] = await Promise.all([
            this.prisma.message.findMany({
                where: whereClause,
                include: {
                    sender: {
                        select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.message.count({
                where: { conversationId },
            }),
        ]);
        const now = new Date();
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true, readAt: now },
        });
        return {
            data: messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                type: msg.type,
                attachmentUrls: msg.attachmentUrls,
                isRead: msg.isRead,
                readAt: msg.readAt,
                createdAt: msg.createdAt,
                sender: msg.senderId === 'SYSTEM'
                    ? null
                    : {
                        id: msg.sender.id,
                        displayName: msg.sender.displayName || `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
                        avatar: msg.sender.avatar,
                    },
                isMine: msg.senderId === userId,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async sendMessage(userId, conversationId, dto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        if (!dto.content || dto.content.trim().length === 0) {
            throw new common_1.BadRequestException('محتوای پیام نمی‌تواند خالی باشد');
        }
        if (dto.content.length > 10000) {
            throw new common_1.BadRequestException('محتوای پیام حداکثر ۱۰,۰۰۰ کاراکتر می‌تواند باشد');
        }
        const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
        const attachmentUrls = dto.fileUrl ? JSON.stringify([dto.fileUrl]) : '[]';
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content: dto.content.trim(),
                type: dto.type || 'TEXT',
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
                lastMessage: dto.content.trim().substring(0, 200),
                lastMessageAt: new Date(),
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: otherUserId,
                type: 'NEW_MESSAGE',
                title: 'پیام جدید',
                message: dto.content.trim().substring(0, 100),
                data: JSON.stringify({
                    conversationId,
                    messageId: message.id,
                    senderId: userId,
                }),
            },
        });
        await this.publishToRedis('chat:messages', {
            conversationId,
            senderId: userId,
            message: {
                id: message.id,
                content: message.content,
                type: message.type,
                attachmentUrls: message.attachmentUrls,
                isRead: message.isRead,
                createdAt: message.createdAt,
                sender: {
                    id: message.sender.id,
                    displayName: message.sender.displayName || `${message.sender.firstName} ${message.sender.lastName}`.trim(),
                    avatar: message.sender.avatar,
                },
                isMine: true,
            },
        });
        await this.publishToRedis('notifications', {
            userId: otherUserId,
            notification: {
                type: 'NEW_MESSAGE',
                conversationId,
                senderId: userId,
            },
        });
        return {
            id: message.id,
            content: message.content,
            type: message.type,
            attachmentUrls: message.attachmentUrls,
            isRead: message.isRead,
            createdAt: message.createdAt,
            sender: {
                id: message.sender.id,
                displayName: message.sender.displayName || `${message.sender.firstName} ${message.sender.lastName}`.trim(),
                avatar: message.sender.avatar,
            },
            isMine: true,
        };
    }
    async markAsRead(conversationId, userId, messageIds) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        const now = new Date();
        let result;
        if (messageIds && messageIds.length > 0) {
            result = await this.prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    conversationId,
                    senderId: { not: userId },
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt: now,
                },
            });
        }
        else {
            result = await this.prisma.message.updateMany({
                where: {
                    conversationId,
                    senderId: { not: userId },
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt: now,
                },
            });
        }
        return {
            count: result.count,
            message: `${result.count} پیام به عنوان خوانده شده علامت‌گذاری شد`,
        };
    }
    async deleteMessage(messageId, userId) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true, conversationId: true, type: true },
        });
        if (!message) {
            throw new common_1.NotFoundException('پیام یافت نشد');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('فقط پیام‌های خودتان را می‌توانید حذف کنید');
        }
        if (message.type === 'SYSTEM') {
            throw new common_1.BadRequestException('پیام‌های سیستمی قابل حذف نیستند');
        }
        await this.prisma.message.update({
            where: { id: messageId },
            data: {
                content: 'پیام حذف شده',
                type: 'DELETED',
            },
        });
        return {
            message: 'پیام با موفقیت حذف شد',
        };
    }
    async searchMessages(conversationId, userId, queryStr) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        if (!queryStr || queryStr.trim().length === 0) {
            throw new common_1.BadRequestException('عبارت جستجو نمی‌تواند خالی باشد');
        }
        const messages = await this.prisma.message.findMany({
            where: {
                conversationId,
                content: { contains: queryStr.trim() },
                type: { notIn: ['SYSTEM', 'DELETED'] },
            },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return {
            data: messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                type: msg.type,
                createdAt: msg.createdAt,
                sender: msg.senderId === 'SYSTEM'
                    ? null
                    : {
                        id: msg.sender.id,
                        displayName: msg.sender.displayName || `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
                        avatar: msg.sender.avatar,
                    },
                isMine: msg.senderId === userId,
            })),
            query: queryStr,
            count: messages.length,
        };
    }
    async getConversationInfo(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                user1: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true, bio: true, city: true },
                },
                user2: {
                    select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true, online: true, lastSeenAt: true, bio: true, city: true },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        const isUser1 = conversation.userId1 === userId;
        const otherUser = isUser1 ? conversation.user2 : conversation.user1;
        const unreadCount = await this.prisma.message.count({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
        });
        let request = null;
        if (conversation.requestId) {
            const req = await this.prisma.serviceRequest.findUnique({
                where: { id: conversation.requestId },
                select: { id: true, title: true, status: true },
            });
            if (req)
                request = req;
        }
        return {
            id: conversation.id,
            requestId: conversation.requestId,
            request,
            participants: [
                {
                    ...conversation.user1,
                    displayName: conversation.user1.displayName || `${conversation.user1.firstName} ${conversation.user1.lastName}`.trim(),
                },
                {
                    ...conversation.user2,
                    displayName: conversation.user2.displayName || `${conversation.user2.firstName} ${conversation.user2.lastName}`.trim(),
                },
            ],
            otherUser: {
                ...otherUser,
                displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
            },
            unreadCount,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            createdAt: conversation.createdAt,
        };
    }
    async blockUser(userId, blockedUserId) {
        if (userId === blockedUserId) {
            throw new common_1.BadRequestException('نمی‌توانید خودتان را مسدود کنید');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: blockedUserId },
            select: { id: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('کاربر مورد نظر یافت نشد');
        }
        const existingConversation = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { userId1: userId, userId2: blockedUserId },
                    { userId1: blockedUserId, userId2: userId },
                ],
            },
        });
        if (existingConversation) {
            await this.prisma.message.create({
                data: {
                    conversationId: existingConversation.id,
                    senderId: 'SYSTEM',
                    content: 'این مکالمه توسط یکی از کاربران مسدود شده است',
                    type: 'SYSTEM_BLOCKED',
                    isRead: true,
                    readAt: new Date(),
                },
            });
        }
        return {
            message: 'کاربر با موفقیت مسدود شد',
            blockedUserId,
        };
    }
    async unblockUser(userId, blockedUserId) {
        if (userId === blockedUserId) {
            throw new common_1.BadRequestException('عملیات نامعتبر');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: blockedUserId },
            select: { id: true },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('کاربر مورد نظر یافت نشد');
        }
        const existingConversation = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { userId1: userId, userId2: blockedUserId },
                    { userId1: blockedUserId, userId2: userId },
                ],
            },
        });
        if (existingConversation) {
            await this.prisma.message.deleteMany({
                where: {
                    conversationId: existingConversation.id,
                    type: 'SYSTEM_BLOCKED',
                },
            });
            await this.prisma.message.create({
                data: {
                    conversationId: existingConversation.id,
                    senderId: 'SYSTEM',
                    content: 'مکالمه مجدداً فعال شد',
                    type: 'SYSTEM',
                    isRead: true,
                    readAt: new Date(),
                },
            });
        }
        return {
            message: 'کاربر از حالت مسدود خارج شد',
            unblockedUserId: blockedUserId,
        };
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.message.count({
            where: {
                conversation: {
                    OR: [{ userId1: userId }, { userId2: userId }],
                },
                isRead: false,
                senderId: { not: userId },
                type: { notIn: ['SYSTEM', 'DELETED'] },
            },
        });
        return {
            count,
        };
    }
    async deleteConversation(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId1: true, userId2: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('مکالمه یافت نشد');
        }
        if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
            throw new common_1.ForbiddenException('شما دسترسی به این مکالمه را ندارید');
        }
        await this.prisma.conversation.delete({
            where: { id: conversationId },
        });
        return {
            message: 'مکالمه با موفقیت حذف شد',
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map