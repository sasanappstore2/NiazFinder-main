import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

const PLATFORM_AI_EMAIL = 'platform-ai@needfinder.internal';

@Injectable()
export class PlatformAiUserService {
  private readonly logger = new Logger(PlatformAiUserService.name);
  private cachedId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private simpleHash(password: string): string {
    return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
  }

  async getPlatformAiUserId(): Promise<string> {
    const fromEnv = process.env.PLATFORM_AI_USER_ID?.trim();
    if (fromEnv) return fromEnv;
    if (this.cachedId) return this.cachedId;

    const existing = await this.prisma.user.findUnique({
      where: { email: PLATFORM_AI_EMAIL },
      select: { id: true },
    });
    if (existing) {
      this.cachedId = existing.id;
      return existing.id;
    }

    const created = await this.prisma.user.create({
      data: {
        email: PLATFORM_AI_EMAIL,
        password: this.simpleHash(crypto.randomBytes(32).toString('hex')),
        firstName: 'هوش',
        lastName: 'مصنوعی',
        displayName: 'هوش مصنوعی نیازفایندر',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        emailVerified: true,
      },
      select: { id: true },
    });
    this.cachedId = created.id;
    this.logger.log(`Created platform AI user ${created.id}`);
    return created.id;
  }
}
