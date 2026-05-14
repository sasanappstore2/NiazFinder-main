import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private createJwtToken(user: { id: string; email: string; role: string }): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      expiresIn: '30d',
    });
  }

  private async createAuthToken(userId: string, jwtToken: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.authToken.create({
      data: {
        userId,
        token: jwtToken,
        type: 'refresh',
        expiresAt,
      },
    });
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('این شماره موبایل قبلاً ثبت شده است');
      }
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
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

    const jwtToken = this.createJwtToken(user);
    await this.createAuthToken(user.id, jwtToken);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: jwtToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    if (!user.password) {
      throw new UnauthorizedException('حساب کاربری با این ایمیل رمز عبور ندارد');
    }

    const isPasswordValid = await this.comparePasswords(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    if (!user.isActive) {
      throw new ForbiddenException('حساب کاربری شما غیرفعال شده است');
    }

    if (user.isBanned) {
      throw new ForbiddenException(`حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}`);
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: now, online: true },
    });

    const jwtToken = this.createJwtToken(user);
    await this.createAuthToken(user.id, jwtToken);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: jwtToken,
    };
  }

  async logout(userId: string, token: string) {
    await this.prisma.authToken.deleteMany({
      where: { userId, token },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { online: false, lastSeenAt: new Date() },
    });

    return { message: 'با موفقیت خارج شدید' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        skills: {
          include: { skill: true },
        },
        givenReviews: {
          select: { rating: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const totalReviews = user.givenReviews.length;
    const avgRating =
      totalReviews > 0
        ? user.givenReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const { password: _, givenReviews: __, skills: skills_, ...userWithoutSensitive } = user;

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
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('این شماره موبایل قبلاً ثبت شده است');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone, phoneVerified: false }),
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    if (!user.password) {
      throw new BadRequestException('حساب کاربری شما رمز عبور ندارد');
    }

    const isOldPasswordValid = await this.comparePasswords(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('رمز عبور فعلی اشتباه است');
    }

    const hashedNewPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    await this.prisma.authToken.deleteMany({
      where: { userId },
    });

    return { message: 'رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید' };
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    await this.prisma.authToken.deleteMany({
      where: { userId },
    });

    const jwtToken = this.createJwtToken(user);
    await this.createAuthToken(userId, jwtToken);

    return { token: jwtToken };
  }

  async verifyEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, isVerified: true },
    });

    return { message: 'ایمیل با موفقیت تأیید شد' };
  }

  async verifyPhone(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    return { message: 'شماره موبایل با موفقیت تأیید شد' };
  }

  async toggleOnlineStatus(userId: string, online: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

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
}
