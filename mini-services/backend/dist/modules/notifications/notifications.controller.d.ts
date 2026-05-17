import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: any, query: QueryNotificationsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
        unreadCount: any;
    }>;
    getUnreadCount(user: any): Promise<{
        count: any;
    }>;
    create(dto: CreateNotificationDto): Promise<{
        id: any;
        type: any;
        title: any;
        message: any;
        data: Record<string, any>;
        isRead: any;
        createdAt: any;
    }>;
    markAllAsRead(user: any): Promise<{
        count: any;
        message: string;
    }>;
    markAsRead(user: any, id: string): Promise<{
        message: string;
    }>;
    delete(user: any, id: string): Promise<{
        message: string;
    }>;
    deleteAll(user: any): Promise<{
        count: any;
        message: string;
    }>;
}
