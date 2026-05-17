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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("@/prisma/prisma.service");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }
    async comparePasswords(plain, hashed) {
        return bcrypt.compare(plain, hashed);
    }
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    createAccessToken(user) {
        const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' };
        return this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
            expiresIn: '30d',
        });
    }
    createRefreshToken(user) {
        const payload = { sub: user.id, email: user.email, role: user.role, type: 'refresh' };
        return this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET || 'needfinder-refresh-secret-key-2024',
            expiresIn: '7d',
        });
    }
    async storeRefreshToken(userId, refreshToken) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.authToken.deleteMany({
            where: { userId, type: 'refresh' },
        });
        await this.prisma.authToken.create({
            data: {
                userId,
                token: refreshToken,
                type: 'refresh',
                expiresAt,
            },
        });
    }
    async storeAccessToken(userId, accessToken) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.prisma.authToken.create({
            data: {
                userId,
                token: accessToken,
                type: 'access',
                expiresAt,
            },
        });
    }
    async invalidateAllTokens(userId) {
        await this.prisma.authToken.deleteMany({
            where: { userId },
        });
    }
    sanitizeUser(user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async register(dto) {
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingEmail) {
            throw new common_1.ConflictException('این ایمیل قبلاً ثبت شده است');
        }
        if (dto.phone) {
            const existingPhone = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (existingPhone) {
                throw new common_1.ConflictException('این شماره موبایل قبلاً ثبت شده است');
            }
        }
        const hashedPassword = await this.hashPassword(dto.password);
        const user = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    firstName: dto.firstName,
                    lastName: dto.lastName || '',
                    phone: dto.phone || null,
                    role: dto.role || 'CLIENT',
                    lastSeenAt: new Date(),
                    online: true,
                    wallet: {
                        create: {
                            balance: 0,
                            frozen: 0,
                        },
                    },
                },
            });
            await tx.notification.create({
                data: {
                    userId: newUser.id,
                    type: 'WELCOME',
                    title: 'به نیاز فایندر خوش آمدید! 👋',
                    message: 'ثبت‌نام شما با موفقیت انجام شد. می‌توانید پروفایل خود را تکمیل کنید و از خدمات پلتفرم استفاده کنید.',
                    data: JSON.stringify({ action: 'complete_profile' }),
                },
            });
            return newUser;
        });
        const accessToken = this.createAccessToken(user);
        const refreshToken = this.createRefreshToken(user);
        await this.storeAccessToken(user.id, accessToken);
        await this.storeRefreshToken(user.id, refreshToken);
        return {
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { wallet: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('حساب کاربری با این ایمیل رمز عبور ندارد');
        }
        const isPasswordValid = await this.comparePasswords(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException('حساب کاربری شما غیرفعال شده است');
        }
        if (user.isBanned) {
            throw new common_1.ForbiddenException(`حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}`);
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastSeenAt: new Date(), online: true },
        });
        const accessToken = this.createAccessToken(user);
        const refreshToken = this.createRefreshToken(user);
        await this.storeAccessToken(user.id, accessToken);
        await this.storeRefreshToken(user.id, refreshToken);
        return {
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'needfinder-refresh-secret-key-2024',
            });
            if (payload.type !== 'refresh') {
                throw new common_1.UnauthorizedException('توکن نامعتبر است');
            }
            const storedToken = await this.prisma.authToken.findFirst({
                where: { userId: payload.sub, token: refreshToken, type: 'refresh' },
            });
            if (!storedToken) {
                throw new common_1.UnauthorizedException('ریفرش توکن نامعتبر است');
            }
            if (storedToken.expiresAt < new Date()) {
                await this.prisma.authToken.delete({ where: { id: storedToken.id } });
                throw new common_1.UnauthorizedException('ریفرش توکن منقضی شده است. لطفاً دوباره وارد شوید');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('کاربر یافت نشد یا غیرفعال است');
            }
            const newAccessToken = this.createAccessToken(user);
            const newRefreshToken = this.createRefreshToken(user);
            await this.storeAccessToken(user.id, newAccessToken);
            await this.storeRefreshToken(user.id, newRefreshToken);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('ریفرش توکن نامعتبر است');
        }
    }
    async verifyEmail(token) {
        const authToken = await this.prisma.authToken.findUnique({
            where: { token, type: 'email_verify' },
        });
        if (!authToken) {
            throw new common_1.BadRequestException('توکن تأیید ایمیل نامعتبر است');
        }
        if (authToken.expiresAt < new Date()) {
            await this.prisma.authToken.delete({ where: { id: authToken.id } });
            throw new common_1.BadRequestException('توکن تأیید ایمیل منقضی شده است. لطفاً دوباره درخواست دهید');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: authToken.userId },
                data: { emailVerified: true, isVerified: true },
            });
            await tx.notification.create({
                data: {
                    userId: authToken.userId,
                    type: 'EMAIL_VERIFIED',
                    title: 'ایمیل شما تأیید شد ✅',
                    message: 'ایمیل شما با موفقیت تأیید شد. حساب کاربری شما اکنون فعال است.',
                },
            });
            await tx.authToken.delete({ where: { id: authToken.id } });
        });
        return { message: 'ایمیل با موفقیت تأیید شد' };
    }
    async requestEmailVerification(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('کاربر یافت نشد');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('ایمیل شما قبلاً تأیید شده است');
        }
        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        await this.prisma.authToken.deleteMany({
            where: { userId, type: 'email_verify' },
        });
        await this.prisma.authToken.create({
            data: {
                userId,
                token,
                type: 'email_verify',
                expiresAt,
            },
        });
        return {
            message: 'لینک تأیید ایمیل ارسال شد',
            token,
        };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز عبور ارسال می‌شود',
            };
        }
        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.authToken.deleteMany({
            where: { userId: user.id, type: 'password_reset' },
        });
        await this.prisma.authToken.create({
            data: {
                userId: user.id,
                token,
                type: 'password_reset',
                expiresAt,
            },
        });
        return {
            message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز عبور ارسال می‌شود',
            token,
        };
    }
    async resetPassword(token, newPassword) {
        const authToken = await this.prisma.authToken.findUnique({
            where: { token, type: 'password_reset' },
        });
        if (!authToken) {
            throw new common_1.BadRequestException('توکن بازنشانی رمز عبور نامعتبر است');
        }
        if (authToken.expiresAt < new Date()) {
            await this.prisma.authToken.delete({ where: { id: authToken.id } });
            throw new common_1.BadRequestException('توکن بازنشانی رمز عبور منقضی شده است. لطفاً دوباره درخواست دهید');
        }
        const hashedPassword = await this.hashPassword(newPassword);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: authToken.userId },
                data: { password: hashedPassword },
            });
            await tx.authToken.deleteMany({
                where: { userId: authToken.userId },
            });
            await tx.notification.create({
                data: {
                    userId: authToken.userId,
                    type: 'PASSWORD_RESET',
                    title: 'رمز عبور شما تغییر کرد 🔐',
                    message: 'رمز عبور شما با موفقیت تغییر کرد. لطفاً با رمز عبور جدید وارد شوید.',
                },
            });
        });
        return { message: 'رمز عبور با موفقیت بازنشانی شد. لطفاً با رمز عبور جدید وارد شوید' };
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return null;
        }
        if (!user.password) {
            return null;
        }
        const isPasswordValid = await this.comparePasswords(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        if (!user.isActive || user.isBanned) {
            return null;
        }
        return this.sanitizeUser(user);
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                skills: {
                    include: { skill: true },
                },
                reviews: {
                    select: { rating: true },
                    where: { isPublished: true },
                },
                _count: {
                    select: {
                        portfolios: { where: { isPublished: true } },
                        sentProposals: { where: { status: 'ACCEPTED' } },
                        requests: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('کاربر یافت نشد');
        }
        const totalReviews = user.reviews.length;
        const avgRating = totalReviews > 0
            ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;
        const { password: _, reviews: __, skills: skills_, _count, ...userWithoutSensitive } = user;
        return {
            ...userWithoutSensitive,
            skillCount: skills_.length,
            skills: skills_.map((us) => ({
                id: us.skill.id,
                name: us.skill.name,
                slug: us.skill.slug,
                level: us.level,
                experience: us.experience,
            })),
            reviewStats: {
                total: totalReviews,
                averageRating: Math.round(avgRating * 10) / 10,
            },
            projectCount: _count.sentProposals,
            requestCount: _count.requests,
            portfolioCount: _count.portfolios,
        };
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('کاربر یافت نشد');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('حساب کاربری شما رمز عبور ندارد');
        }
        const isOldPasswordValid = await this.comparePasswords(dto.oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new common_1.BadRequestException('رمز عبور فعلی اشتباه است');
        }
        const hashedNewPassword = await this.hashPassword(dto.newPassword);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
            await tx.authToken.deleteMany({
                where: { userId },
            });
        });
        return { message: 'رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید' };
    }
    async logout(userId, token) {
        await this.prisma.authToken.deleteMany({
            where: { userId },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { online: false, lastSeenAt: new Date() },
        });
        return { message: 'با موفقیت خارج شدید' };
    }
    async toggleOnlineStatus(userId, online) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                online,
                lastSeenAt: new Date(),
            },
        });
        return {
            message: online ? 'وضعیت آنلاین فعال شد' : 'وضعیت آفلاین فعال شد',
            online,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map