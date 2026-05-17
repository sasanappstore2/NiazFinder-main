import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SearchUsersDto } from './dto/search-users.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(query: QueryUsersDto): Promise<{
        users: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    searchUsers(query: SearchUsersDto): Promise<{
        users: any;
        message: string;
    }>;
    getCurrentUser(user: any): Promise<any>;
    updateProfile(user: any, dto: UpdateProfileDto): Promise<{
        user: any;
        message: string;
    }>;
    updateAvatar(user: any, body: {
        avatarUrl: string;
    }): Promise<{
        user: any;
        message: string;
    }>;
    changePassword(user: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getProfileCompletion(user: any): Promise<{
        percentage: number;
        completedFields: number;
        totalFields: number;
        details: {
            name: string;
            completed: boolean;
            weight: number;
        }[];
    }>;
    getDashboardStats(user: any): Promise<{
        requestsCount: any;
        proposalsCount: any;
        reviewsCount: any;
        walletBalance: any;
        walletFrozen: any;
        unreadNotifications: any;
        role: any;
        isVerified: any;
    }>;
    findOne(id: string): Promise<any>;
    deactivateUser(id: string): Promise<{
        message: string;
    }>;
    toggleStatus(id: string, data: {
        isActive?: boolean;
        isBanned?: boolean;
        banReason?: string;
    }): Promise<{
        user: any;
        message: string;
    }>;
    getSpecialistProfile(id: string): Promise<any>;
}
