import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async applyRating(businessProfileId: string, rating: number) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: businessProfileId },
      select: { trustScore: true },
    });
    if (!profile) return;
    await this.prisma.businessProfile.update({
      where: { id: businessProfileId },
      data: { trustScore: clamp(0, 5, 0.85 * profile.trustScore + 0.15 * rating) },
    });
  }

  async penalizeFalseClaim(businessProfileId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: businessProfileId },
      select: { trustScore: true },
    });
    if (!profile) return;
    await this.prisma.businessProfile.update({
      where: { id: businessProfileId },
      data: { trustScore: clamp(0, 5, profile.trustScore - 0.5) },
    });
  }
}
