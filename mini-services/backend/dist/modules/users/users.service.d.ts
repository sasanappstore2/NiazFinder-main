import { PrismaService } from '@/prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<any>;
    findAll(query: QueryUsersDto): Promise<{
        users: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        user: any;
        message: string;
    }>;
    updateAvatar(userId: string, avatarUrl: string): Promise<{
        user: any;
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    updateOnlineStatus(userId: string, isOnline: boolean): Promise<{
        message: string;
        online: boolean;
    }>;
    getProfileCompletion(userId: string): Promise<{
        percentage: number;
        completedFields: number;
        totalFields: number;
        details: {
            name: string;
            completed: boolean;
            weight: number;
        }[];
    }>;
    deactivateUser(userId: string): Promise<{
        message: string;
    }>;
    searchUsers(query: string): Promise<{
        users: any;
        message: string;
    }>;
    adminGetAll(query: QueryUsersDto): Promise<{
        users: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    adminToggleStatus(userId: string, data: {
        isActive?: boolean;
        isBanned?: boolean;
        banReason?: string;
    }): Promise<{
        user: any;
        message: string;
    }>;
    getDashboardStats(userId: string): Promise<{
        requestsCount: any;
        proposalsCount: any;
        reviewsCount: any;
        walletBalance: any;
        walletFrozen: any;
        unreadNotifications: any;
        role: any;
        isVerified: any;
    }>;
    getSpecialistProfile(id: string): Promise<any>;
    private userSelectFields;
    private getOrderBy;
    private ensureUserExists;
}
