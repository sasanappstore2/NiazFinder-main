import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PaymentRequiredException } from './exceptions/payment-required.exception';

@Injectable()
export class AiAgentWalletService {
  private readonly logger = new Logger(AiAgentWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  messageFee(): number {
    return Number(process.env.AGENT_MESSAGE_FEE_TOMAN ?? 500);
  }

  async deductInTransaction(
    userId: string,
    params: { idempotencyKey: string; referenceId: string },
  ) {
    const amount = this.messageFee();
    return this.prisma.$transaction(
      async (tx) => {
        const result = await this.walletService.deductAgentMessageFee(tx, {
          userId,
          amount,
          idempotencyKey: params.idempotencyKey,
          referenceId: params.referenceId,
        });
        return {
          transactionId: result.transaction.id,
          amount,
          duplicate: result.duplicate,
        };
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
    );
  }

  async refundOnFailure(
    userId: string,
    params: { idempotencyKey: string; referenceId: string; duplicate: boolean },
  ) {
    if (params.duplicate) return;
    const amount = this.messageFee();
    try {
      await this.prisma.$transaction(
        async (tx) => {
          await this.walletService.refundAgentMessageFee(tx, {
            userId,
            amount,
            idempotencyKey: params.idempotencyKey,
            referenceId: params.referenceId,
          });
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
      );
    } catch (err) {
      this.logger.error('Agent message refund failed', err);
    }
  }
}

export { PaymentRequiredException };
