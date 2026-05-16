import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import Redis from 'ioredis';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private redisPublisher: Redis | null = null;

  constructor(private prisma: PrismaService) {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      await this.redisPublisher.connect();
      this.logger.log('✅ NotificationsService Redis publisher connected');
    } catch (error) {
      this.logger.warn(`⚠️ NotificationsService Redis not available: ${error instanceof Error ? error.message : error}`);
      this.redisPublisher = null;
    }
  }

  private async publishToRedis(channel: string, data: any) {
    if (this.redisPublisher) {
      try {
        await this.redisPublisher.publish(channel, JSON.stringify(data));
      } catch (error) {
        this.logger.error(`Failed to publish to Redis channel ${channel}: ${error}`);
      }
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(userId: string, query: QueryNotificationsDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };

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

  async create(userId: string, dto: CreateNotificationDto) {
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

    // Queue push notification via Redis (publish to notifications channel)
    await this.publishToRedis('notifications', {
      userId,
      notification: notificationPayload,
    });

    return notificationPayload;
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('اعلان یافت نشد');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('شما دسترسی به این اعلان را ندارید');
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

  async markAllAsRead(userId: string) {
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

  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('اعلان یافت نشد');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('شما دسترسی به این اعلان را ندارید');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      message: 'اعلان با موفقیت حذف شد',
    };
  }

  async deleteAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return {
      count: result.count,
      message: `${result.count} اعلان با موفقیت حذف شد`,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      count,
    };
  }

  // ─── Push & Broadcast ─────────────────────────────────────────────────────

  /**
   * Queue a push notification for a specific user.
   * Publishes to Redis 'notifications' channel for WebSocket delivery.
   */
  async sendPush(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    // Create notification in DB
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

    // Publish to Redis for WebSocket delivery
    await this.publishToRedis('notifications', {
      userId,
      notification: payload,
    });

    return payload;
  }

  /**
   * Broadcast a notification to all users (admin only).
   * Creates individual notifications for all active users.
   */
  async broadcast(dto: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    // Get all active users
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

    // Publish broadcast event
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
}
