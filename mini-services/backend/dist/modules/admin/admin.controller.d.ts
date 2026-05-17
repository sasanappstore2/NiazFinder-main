import { AdminService } from './admin.service';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { ManageRequestDto } from './dto/manage-request.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryAdminLogsDto } from './dto/query-admin-logs.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        users: {
            total: any;
            active: any;
            newThisMonth: any;
            growthPercent: number;
        };
        specialists: {
            total: any;
            verified: any;
        };
        requests: {
            total: any;
            open: any;
            inProgress: any;
            completed: any;
            newThisMonth: any;
            growthPercent: number;
        };
        proposals: {
            total: any;
            pending: any;
        };
        revenue: {
            total: any;
            pendingWithdrawals: any;
        };
        reviews: {
            total: any;
            avgRating: number;
        };
        coupons: {
            total: any;
            active: any;
        };
        reports: {
            pending: any;
        };
        topCategories: any;
        topCities: any;
        growthMetrics: {
            vsLastMonth: {
                users: {
                    thisMonth: any;
                    lastMonth: any;
                    growthPercent: number;
                };
                requests: {
                    thisMonth: any;
                    lastMonth: any;
                    growthPercent: number;
                };
            };
        };
    }>;
    getUsers(query: QueryAdminUsersDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    toggleUserStatus(adminId: string, userId: string, dto: ToggleUserStatusDto): Promise<{
        message: string;
    }>;
    manageRequest(adminId: string, requestId: string, dto: ManageRequestDto): Promise<{
        message: string;
        data: any;
    }>;
    getAuditLogs(query: QueryAdminLogsDto): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    getSystemHealth(): Promise<{
        status: string;
        timestamp: string;
        database: {
            status: string;
            latency: string;
        };
        metrics: {
            totalUsers: any;
            activeSessions: any;
            pendingReports: any;
            pendingWithdrawals: any;
            todayRequests: any;
            todayProposals: any;
        };
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
    }>;
    createCoupon(adminId: string, dto: CreateCouponDto): Promise<{
        message: string;
        data: any;
    }>;
    getCoupons(): Promise<any>;
    deleteCoupon(adminId: string, couponId: string): Promise<{
        message: string;
    }>;
    getReports(status?: string, page?: string, limit?: string): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    getRecentActivity(): Promise<any[]>;
}
