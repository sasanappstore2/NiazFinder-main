import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getUserStats(user: any): Promise<{
        totalRequests: any;
        activeRequests: any;
        completedProjects: any;
        thisMonthRequests: any;
        totalProposals: any;
        acceptedProposals: any;
        successRate: number;
        thisMonthProposals: any;
        totalEarnings: any;
        pendingPayments: any;
        walletBalance: any;
        walletFrozen: any;
        walletAvailable: number;
        averageRating: number;
        totalReviews: any;
        profileCompletion: number;
        skillsCount: any;
        portfolioCount: any;
        unreadMessages: any;
        unreadNotifications: any;
    } | null>;
    getAdminStats(): Promise<{
        users: {
            total: any;
            newThisMonth: any;
            active: any;
            growthPercent: number;
        };
        requests: {
            total: any;
            open: any;
            completed: any;
            newThisMonth: any;
            growthPercent: number;
        };
        proposals: {
            total: any;
            pending: any;
        };
        specialists: {
            total: any;
            verified: any;
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
    }>;
    getWeeklyChart(user: any): Promise<{
        date: string;
        label: string;
        requests: number;
        proposals: number;
    }[]>;
    getMonthlyChart(user: any): Promise<{
        month: string;
        earnings: number;
        expenses: number;
    }[]>;
    getRecentActivity(user: any): Promise<any[]>;
}
