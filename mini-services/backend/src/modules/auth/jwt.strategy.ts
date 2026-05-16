import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        role: true,
        isVerified: true,
        isActive: true,
        isBanned: true,
        online: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('حساب کاربری غیرفعال شده است');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('حساب کاربری مسدود شده است');
    }

    // Update last seen
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), online: true },
    });

    return user;
  }
}
