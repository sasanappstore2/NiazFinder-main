import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletLeadFeeService } from './wallet-lead-fee.service';
import { NeedVisibilityService } from './need-visibility.service';

@Injectable()
export class VipBroadcastService {
  private readonly logger = new Logger(VipBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletLeadFee: WalletLeadFeeService,
    private readonly visibility: NeedVisibilityService,
  ) {}

  private leadFee() {
    const n = parseInt(process.env.LEAD_FEE_TOMAN ?? '5000', 10);
    return Number.isFinite(n) && n > 0 ? n : 5000;
  }

  private maxPrivateLeads() {
    const n = parseInt(process.env.MAX_PRIVATE_LEADS_PER_BUSINESS ?? '100', 10);
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  private maxPerRequest() {
    const n = parseInt(process.env.LEAD_OUTREACH_MAX_PER_REQUEST ?? '8', 10);
    return Number.isFinite(n) && n > 0 ? n : 8;
  }

  async run(requestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { category: true },
    });
    if (!request || request.status !== 'OPEN' || request.moderationStatus !== 'APPROVED') {
      return { requestId, qualified: 0, sent: 0, skipped: 0, errors: 0 };
    }

    const vipExpiresAt = new Date(Date.now() + this.visibility.getVipTtlMs());
    await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: { needAccessStatus: 'PRIVATE', vipExpiresAt },
    });

    const businesses = await this.prisma.businessProfile.findMany({
      where: {
        status: 'ACTIVE',
        leadAlertsEnabled: true,
        userId: { not: request.userId },
        ...(request.city ? { city: request.city } : {}),
      },
      take: 30,
      include: { user: { include: { wallet: true } } },
    });

    const leadFee = this.leadFee();
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const profile of businesses) {
      if (sent >= this.maxPerRequest()) break;

      const privateCount = await this.prisma.needLeadOutreach.count({
        where: { businessProfileId: profile.id, accessPhase: 'PRIVATE', status: 'SENT' },
      });
      if (privateCount >= this.maxPrivateLeads()) {
        skipped++;
        continue;
      }

      const wallet = profile.user.wallet;
      const available = (wallet?.balance ?? 0) - (wallet?.frozen ?? 0);
      if (available < leadFee) {
        skipped++;
        continue;
      }

      const idempotencyKey = `lead:${requestId}:${profile.userId}`;
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const { transaction } = await this.walletLeadFee.deductLeadFee(tx, {
              userId: profile.userId,
              amount: leadFee,
              idempotencyKey,
              referenceId: requestId,
            });

            await tx.needLeadOutreach.upsert({
              where: { idempotencyKey },
              create: {
                requestId,
                businessProfileId: profile.id,
                businessUserId: profile.userId,
                status: 'SENT',
                accessPhase: 'PRIVATE',
                idempotencyKey,
                leadFeeAmount: leadFee,
                feeDeductedAt: new Date(),
                walletTransactionId: transaction.id,
                matchReasonFa: request.category?.name ?? '',
              },
              update: {
                status: 'SENT',
                accessPhase: 'PRIVATE',
                leadFeeAmount: leadFee,
                feeDeductedAt: new Date(),
                walletTransactionId: transaction.id,
              },
            });
          },
          { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
        );

        await this.prisma.notification.create({
          data: {
            userId: profile.userId,
            type: 'AI_NEED_LEAD',
            title: 'لید VIP جدید',
            message: `نیاز VIP: ${request.title}`,
            data: JSON.stringify({ requestId, businessProfileId: profile.id, accessPhase: 'PRIVATE' }),
          },
        });
        sent++;
      } catch (e) {
        this.logger.warn(`VIP lead failed for ${profile.id}: ${e}`);
        errors++;
      }
    }

    await this.visibility.scheduleExpiry(requestId);

    return {
      requestId,
      qualified: businesses.length,
      sent,
      skipped,
      errors,
      vipExpiresAt: vipExpiresAt.toISOString(),
    };
  }
}
