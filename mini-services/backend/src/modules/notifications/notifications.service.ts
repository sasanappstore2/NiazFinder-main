import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
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

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: dto.data || {},
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
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
}
