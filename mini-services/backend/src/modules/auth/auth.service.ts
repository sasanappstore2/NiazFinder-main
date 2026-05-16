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
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==================== Helpers ====================

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private createAccessToken(user: { id: string; email: string; role: string }): string {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'needfinder-jwt-secret-key-2024',
      expiresIn: '30d',
    });
  }

  private createRefreshToken(user: { id: string; email: string; role: string }): string {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'needfinder-refresh-secret-key-2024',
      expiresIn: '7d',
    });
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Delete old refresh tokens for this user
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

  private async storeAccessToken(userId: string, accessToken: string): Promise<void> {
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

  private async invalidateAllTokens(userId: string): Promise<void> {
    await this.prisma.authToken.deleteMany({
      where: { userId },
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ==================== Registration ====================

  async register(dto: RegisterDto) {
    // Check existing email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }

    // Check existing phone
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('این شماره موبایل قبلاً ثبت شده است');
      }
    }

    const hashedPassword = await this.hashPassword(dto.password);

    // Create user with wallet and welcome notification in transaction
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

      // Send welcome notification
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

  // ==================== Login ====================

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
      throw new ForbiddenException(
        `حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}`,
      );
    }

    // Update online status
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

  // ==================== Token Refresh ====================

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'needfinder-refresh-secret-key-2024',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('توکن نامعتبر است');
      }

      // Check if refresh token exists in database
      const storedToken = await this.prisma.authToken.findFirst({
        where: { userId: payload.sub, token: refreshToken, type: 'refresh' },
      });

      if (!storedToken) {
        throw new UnauthorizedException('ریفرش توکن نامعتبر است');
      }

      if (storedToken.expiresAt < new Date()) {
        await this.prisma.authToken.delete({ where: { id: storedToken.id } });
        throw new UnauthorizedException('ریفرش توکن منقضی شده است. لطفاً دوباره وارد شوید');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('کاربر یافت نشد یا غیرفعال است');
      }

      const newAccessToken = this.createAccessToken(user);
      const newRefreshToken = this.createRefreshToken(user);

      await this.storeAccessToken(user.id, newAccessToken);
      await this.storeRefreshToken(user.id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('ریفرش توکن نامعتبر است');
    }
  }

  // ==================== Email Verification ====================

  async verifyEmail(token: string) {
    // Find token in AuthToken table (type: 'email_verify')
    const authToken = await this.prisma.authToken.findUnique({
      where: { token, type: 'email_verify' },
    });

    if (!authToken) {
      throw new BadRequestException('توکن تأیید ایمیل نامعتبر است');
    }

    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('توکن تأیید ایمیل منقضی شده است. لطفاً دوباره درخواست دهید');
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

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    if (user.emailVerified) {
      throw new BadRequestException('ایمیل شما قبلاً تأیید شده است');
    }

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Delete old verification tokens
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
      token, // In production, send via email
    };
  }

  // ==================== Password Reset ====================

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal whether email exists for security
      return {
        message: 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز عبور ارسال می‌شود',
      };
    }

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Delete old reset tokens
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
      token, // In production, send via email
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const authToken = await this.prisma.authToken.findUnique({
      where: { token, type: 'password_reset' },
    });

    if (!authToken) {
      throw new BadRequestException('توکن بازنشانی رمز عبور نامعتبر است');
    }

    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('توکن بازنشانی رمز عبور منقضی شده است. لطفاً دوباره درخواست دهید');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: authToken.userId },
        data: { password: hashedPassword },
      });

      // Invalidate all tokens (force re-login)
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

  // ==================== Validate User (for Passport) ====================

  async validateUser(email: string, password: string) {
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

  // ==================== Profile ====================

  async getProfile(userId: string) {
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
      throw new NotFoundException('کاربر یافت نشد');
    }

    const totalReviews = user.reviews.length;
    const avgRating =
      totalReviews > 0
        ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const { password: _, reviews: __, skills: skills_, _count, ...userWithoutSensitive } =
      user as any;

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

  // ==================== Password Change ====================

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

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // Invalidate all tokens (force re-login)
      await tx.authToken.deleteMany({
        where: { userId },
      });
    });

    return { message: 'رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید' };
  }

  // ==================== Logout ====================

  async logout(userId: string, token: string) {
    // Invalidate all tokens for this user (blacklist approach)
    await this.prisma.authToken.deleteMany({
      where: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { online: false, lastSeenAt: new Date() },
    });

    return { message: 'با موفقیت خارج شدید' };
  }

  // ==================== Online Status ====================

  async toggleOnlineStatus(userId: string, online: boolean) {
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
