import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NeedVisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('need-expiry') private readonly expiryQueue: Queue,
  ) {}

  getVipTtlMs() {
    const n = parseInt(process.env.VIP_TTL_MS ?? '10800000', 10);
    return Number.isFinite(n) && n > 0 ? n : 10_800_000;
  }

  async flipNeedToPublic(requestId: string) {
    const need = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { needAccessStatus: true, status: true },
    });
    if (!need) return { skipped: 'not_found' };
    if (need.needAccessStatus !== 'PRIVATE') return { skipped: 'not_private' };
    if (need.status !== 'OPEN') return { skipped: 'not_open' };

    const updated = await this.prisma.serviceRequest.updateMany({
      where: { id: requestId, needAccessStatus: 'PRIVATE', status: 'OPEN' },
      data: { needAccessStatus: 'PUBLIC' },
    });
    return updated.count > 0 ? { flipped: true } : { skipped: 'race' };
  }

  async scheduleExpiry(requestId: string) {
    const jobId = `need-expiry-${requestId}`;
    await this.expiryQueue.add(
      'flip-to-public',
      { requestId, enqueuedAt: Date.now() },
      {
        jobId,
        delay: this.getVipTtlMs(),
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 8,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );
  }

  async getVisibility(requestId: string) {
    const need = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { needAccessStatus: true, vipExpiresAt: true, status: true },
    });
    if (!need) return null;
    const now = Date.now();
    const expiresAt = need.vipExpiresAt?.getTime() ?? null;
    const remainingMs =
      need.needAccessStatus === 'PRIVATE' && expiresAt ? Math.max(0, expiresAt - now) : 0;
    return {
      needAccessStatus: need.needAccessStatus,
      vipExpiresAt: need.vipExpiresAt?.toISOString() ?? null,
      status: need.status,
      remainingMs,
    };
  }
}
