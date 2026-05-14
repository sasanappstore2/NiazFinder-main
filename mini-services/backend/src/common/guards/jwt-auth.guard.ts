import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('لطفاً ابتدا وارد حساب کاربری خود شوید');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('توکن نامعتبر است');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      });

      // Check if token exists in database
      const authToken = await this.prisma.authToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!authToken) {
        throw new UnauthorizedException('توکن نامعتبر است');
      }

      if (authToken.expiresAt < new Date()) {
        await this.prisma.authToken.delete({ where: { id: authToken.id } });
        throw new UnauthorizedException('توکن منقضی شده است. لطفاً دوباره وارد شوید');
      }

      const user = authToken.user;
      if (!user.isActive) {
        throw new ForbiddenException('حساب کاربری شما غیرفعال شده است');
      }
      if (user.isBanned) {
        throw new ForbiddenException(`حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}`);
      }

      // Update last seen
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

      // Check roles
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(user.role)) {
          throw new ForbiddenException('شما دسترسی به این بخش را ندارید');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('توکن نامعتبر است');
    }
  }
}
