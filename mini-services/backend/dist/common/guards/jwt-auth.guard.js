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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../prisma/prisma.service");
const core_1 = require("@nestjs/core");
exports.ROLES_KEY = 'roles';
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService, prisma, reflector) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('لطفاً ابتدا وارد حساب کاربری خود شوید');
        }
        const token = authHeader.slice(7).trim();
        if (!token) {
            throw new common_1.UnauthorizedException('توکن نامعتبر است');
        }
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
            });
            const authToken = await this.prisma.authToken.findUnique({
                where: { token },
                include: { user: true },
            });
            if (!authToken) {
                throw new common_1.UnauthorizedException('توکن نامعتبر است');
            }
            if (authToken.expiresAt < new Date()) {
                await this.prisma.authToken.delete({ where: { id: authToken.id } });
                throw new common_1.UnauthorizedException('توکن منقضی شده است. لطفاً دوباره وارد شوید');
            }
            const user = authToken.user;
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
            request.user = {
                id: user.id,
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                city: user.city,
                province: user.province,
                role: user.role,
                isVerified: user.isVerified,
                isActive: user.isActive,
                isBanned: user.isBanned,
                createdAt: user.createdAt,
            };
            const requiredRoles = this.reflector.getAllAndOverride(exports.ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            if (requiredRoles && requiredRoles.length > 0) {
                if (!requiredRoles.includes(user.role)) {
                    throw new common_1.ForbiddenException('شما دسترسی به این بخش را ندارید');
                }
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('توکن نامعتبر است');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, prisma_service_1.PrismaService, typeof (_b = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _b : Object])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map