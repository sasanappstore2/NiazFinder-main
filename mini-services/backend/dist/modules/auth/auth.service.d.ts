import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    hashPassword(password: string): Promise<string>;
    comparePasswords(plain: string, hashed: string): Promise<boolean>;
    private generateToken;
    private createAccessToken;
    private createRefreshToken;
    private storeRefreshToken;
    private storeAccessToken;
    private invalidateAllTokens;
    private sanitizeUser;
    register(dto: RegisterDto): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    requestEmailVerification(userId: string): Promise<{
        message: string;
        token: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
        token?: undefined;
    } | {
        message: string;
        token: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    validateUser(email: string, password: string): Promise<any>;
    getProfile(userId: string): Promise<any>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    logout(userId: string, token: string): Promise<{
        message: string;
    }>;
    toggleOnlineStatus(userId: string, online: boolean): Promise<{
        message: string;
        online: boolean;
    }>;
}
