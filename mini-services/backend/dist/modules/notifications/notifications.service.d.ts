import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    private redisPublisher;
    constructor(prisma: PrismaService);
    private initRedis;
    private publishToRedis;
    findAll(userId: string, query: QueryNotificationsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
        unreadCount: any;
    }>;
    create(userId: string, dto: CreateNotificationDto): Promise<{
        id: any;
        type: any;
        title: any;
        message: any;
        data: Record<string, any>;
        isRead: any;
        createdAt: any;
    }>;
    markAsRead(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
    markAllAsRead(userId: string): Promise<{
        count: any;
        message: string;
    }>;
    delete(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
    deleteAll(userId: string): Promise<{
        count: any;
        message: string;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: any;
    }>;
    sendPush(userId: string, notification: {
        type: string;
        title: string;
        message: string;
        data?: Record<string, any>;
    }): Promise<{
        id: any;
        type: any;
        title: any;
        message: any;
        data: Record<string, any>;
        isRead: any;
        createdAt: any;
    }>;
    broadcast(dto: {
        type: string;
        title: string;
        message: string;
        data?: Record<string, any>;
    }): Promise<{
        count: number;
        message: string;
    }>;
}
