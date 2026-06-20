import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRequiredException } from '../ai-agent/exceptions/payment-required.exception';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create wallet for user
   */
  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0, frozen: 0 },
      });
    }

    return wallet;
  }

  /**
   * Get wallet with balance, frozen, available (balance - frozen)
   */
  async getBalance(userId: string) {
    const wallet = await this.getWallet(userId);

    return {
      balance: wallet.balance,
      frozen: wallet.frozen,
      available: wallet.balance - wallet.frozen,
    };
  }

  /**
   * Get paginated transaction history
   */
  async getTransactions(userId: string, query: QueryTransactionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.type) {
      where.type = query.type as any;
    }

    if (query.status) {
      where.status = query.status as any;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Deposit funds - create COMPLETED DEPOSIT transaction, increment balance
   */
  async deposit(userId: string, dto: ChargeDto) {
    const wallet = await this.getWallet(userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'DEPOSIT',
          amount: dto.amount,
          description: dto.description || 'شارژ کیف پول',
          status: 'COMPLETED',
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: dto.amount } },
      });

      return { transaction: newTx, wallet: updatedWallet };
    });

    // Notify user
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_DEPOSIT',
        title: 'شارژ کیف پول',
        message: `مبلغ ${dto.amount.toLocaleString('fa-IR')} ریال به کیف پول شما اضافه شد`,
        data: JSON.stringify({
          transactionId: result.transaction.id,
          amount: dto.amount,
        }),
      },
    });

    this.logger.log(`Deposit: ${dto.amount} for user ${userId}`);

    return {
      message: 'کیف پول شما با موفقیت شارژ شد',
      transaction: result.transaction,
      wallet: result.wallet,
    };
  }

  /**
   * Withdraw funds - validate sufficient balance, create PENDING WITHDRAW,
   * deduct from balance + add to frozen
   */
  async withdraw(userId: string, dto: WithdrawDto) {
    const wallet = await this.getWallet(userId);

    const availableBalance = wallet.balance - wallet.frozen;

    if (availableBalance < dto.amount) {
      throw new BadRequestException(
        `موجودی قابل برداشت کافی نیست. موجودی فعلی: ${this.formatAmount(availableBalance)} ریال`,
      );
    }

    if (dto.amount < 50000) {
      throw new BadRequestException('حداقل مبلغ برداشت ۵۰,۰۰۰ ریال است');
    }

    // Create WITHDRAW transaction with PENDING status
    const result = await this.prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'WITHDRAW',
          amount: dto.amount,
          description: dto.description || 'برداشت از کیف پول',
          status: 'PENDING',
          metadata: JSON.stringify({
            bankAccountNumber: dto.bankAccountNumber,
            bankName: dto.bankName,
          }),
        },
      });

      // Decrement balance and freeze amount
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: dto.amount },
          frozen: { increment: dto.amount },
        },
      });

      return { transaction: newTx, wallet: updatedWallet };
    });

    // Notify user
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_WITHDRAW',
        title: 'درخواست برداشت',
        message: `درخواست برداشت ${dto.amount.toLocaleString('fa-IR')} ریال ثبت شد و پس از تأیید مدیریت پرداخت خواهد شد`,
        data: JSON.stringify({
          transactionId: result.transaction.id,
          amount: dto.amount,
        }),
      },
    });

    this.logger.log(`Withdraw request: ${dto.amount} for user ${userId}`);

    return {
      message: 'درخواست برداشت شما با موفقیت ثبت شد و پس از تأیید مدیریت پرداخت خواهد شد',
      transaction: result.transaction,
      wallet: result.wallet,
    };
  }

  /**
   * Transfer between wallets (for project payment)
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string,
    requestId?: string,
  ) {
    // Validate recipient exists
    const toUser = await this.prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!toUser) {
      throw new NotFoundException('کاربر گیرنده یافت نشد');
    }

    if (!toUser.isActive || toUser.isBanned) {
      throw new BadRequestException('کاربر گیرنده فعال نیست');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestException('نمی‌توانید به خودتان منتقل کنید');
    }

    const senderWallet = await this.getWallet(fromUserId);

    if (senderWallet.balance < amount) {
      throw new BadRequestException('موجودی کیف پول کافی نیست');
    }

    const receiverWallet = await this.getWallet(toUserId);

    // Execute transfer in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create PAYMENT for sender
      const senderTx = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          userId: fromUserId,
          type: 'PAYMENT',
          amount,
          description: description || `پرداخت به کاربر ${toUserId}`,
          referenceId: requestId || toUserId,
          status: 'COMPLETED',
        },
      });

      // Create PAYMENT for receiver
      const receiverTx = await tx.transaction.create({
        data: {
          walletId: receiverWallet.id,
          userId: toUserId,
          type: 'PAYMENT',
          amount,
          description: description || `دریافت از کاربر ${fromUserId}`,
          referenceId: requestId || fromUserId,
          status: 'COMPLETED',
        },
      });

      // Update balances
      const updatedSenderWallet = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      const updatedReceiverWallet = await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: amount } },
      });

      return {
        senderTransaction: senderTx,
        receiverTransaction: receiverTx,
        senderWallet: updatedSenderWallet,
        receiverWallet: updatedReceiverWallet,
      };
    });

    // Notify both users
    await Promise.all([
      this.prisma.notification.create({
        data: {
          userId: fromUserId,
          type: 'WALLET_PAYMENT',
          title: 'پرداخت موفق',
          message: `مبلغ ${amount.toLocaleString('fa-IR')} ریال با موفقیت پرداخت شد`,
          data: JSON.stringify({
            transactionId: result.senderTransaction.id,
            amount,
            toUserId,
            requestId,
          }),
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'WALLET_RECEIVE',
          title: 'دریافت وجه',
          message: `مبلغ ${amount.toLocaleString('fa-IR')} ریال به کیف پول شما واریز شد`,
          data: JSON.stringify({
            transactionId: result.receiverTransaction.id,
            amount,
            fromUserId,
            requestId,
          }),
        },
      }),
    ]);

    this.logger.log(`Transfer: ${amount} from ${fromUserId} to ${toUserId}`);

    return {
      message: 'انتقال وجه با موفقیت انجام شد',
      ...result,
    };
  }

  /**
   * Freeze amount for escrow
   */
  async freeze(userId: string, amount: number) {
    const wallet = await this.getWallet(userId);

    const availableBalance = wallet.balance - wallet.frozen;

    if (availableBalance < amount) {
      throw new BadRequestException(
        `موجودی قابل فریز کافی نیست. موجودی فعلی: ${this.formatAmount(availableBalance)} ریال`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'ESCROW_HOLD',
          amount,
          description: 'فریز مبلغ برای امانی',
          status: 'COMPLETED',
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { frozen: { increment: amount } },
      });

      return { transaction, wallet: updatedWallet };
    });

    this.logger.log(`Freeze: ${amount} for user ${userId}`);

    return result;
  }

  /**
   * Unfreeze after project completion
   */
  async unfreeze(userId: string, amount: number) {
    const wallet = await this.getWallet(userId);

    if (wallet.frozen < amount) {
      throw new BadRequestException('مبلغ فریز شده کافی نیست');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'ESCROW_RELEASE',
          amount,
          description: 'آزادسازی مبلغ امانی',
          status: 'COMPLETED',
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { frozen: { decrement: amount } },
      });

      return { transaction, wallet: updatedWallet };
    });

    this.logger.log(`Unfreeze: ${amount} for user ${userId}`);

    return result;
  }

  /**
   * Process withdrawal - Admin approve/reject
   */
  async processWithdrawal(transactionId: string, adminId: string, approve: boolean) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          select: { id: true, userId: true, frozen: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('تراکنش مورد نظر یافت نشد');
    }

    if (transaction.type !== 'WITHDRAW') {
      throw new BadRequestException('این تراکنش مربوط به برداشت نیست');
    }

    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('این درخواست برداشت قبلاً پردازش شده است');
    }

    if (approve) {
      // Approve: unfreeze the amount (already deducted from balance)
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedTx = await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED' },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: transaction.wallet.id },
          data: { frozen: { decrement: transaction.amount } },
        });

        // Create admin log
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'APPROVE_WITHDRAW',
            target: `Transaction:${transactionId}`,
            details: JSON.stringify({
              transactionId,
              userId: transaction.wallet.userId,
              amount: transaction.amount,
            }),
          },
        });

        return { transaction: updatedTx, wallet: updatedWallet };
      });

      // Notify user
      await this.prisma.notification.create({
        data: {
          userId: transaction.wallet.userId,
          type: 'WALLET_WITHDRAW_APPROVED',
          title: 'تأیید برداشت',
          message: `درخواست برداشت ${transaction.amount.toLocaleString('fa-IR')} ریال تأیید شد`,
          data: JSON.stringify({ transactionId, amount: transaction.amount }),
        },
      });

      this.logger.log(`Withdraw approved: ${transactionId} by admin ${adminId}`);

      return {
        message: 'درخواست برداشت تأیید شد',
        transaction: result.transaction,
        wallet: result.wallet,
      };
    } else {
      // Reject: return the amount to balance and unfreeze
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedTx = await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'FAILED' },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: transaction.wallet.id },
          data: {
            balance: { increment: transaction.amount },
            frozen: { decrement: transaction.amount },
          },
        });

        // Create admin log
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'REJECT_WITHDRAW',
            target: `Transaction:${transactionId}`,
            details: JSON.stringify({
              transactionId,
              userId: transaction.wallet.userId,
              amount: transaction.amount,
            }),
          },
        });

        return { transaction: updatedTx, wallet: updatedWallet };
      });

      // Notify user
      await this.prisma.notification.create({
        data: {
          userId: transaction.wallet.userId,
          type: 'WALLET_WITHDRAW_REJECTED',
          title: 'رد درخواست برداشت',
          message: 'درخواست برداشت شما رد شد و مبلغ به کیف پول شما بازگشت',
          data: JSON.stringify({ transactionId, amount: transaction.amount }),
        },
      });

      this.logger.log(`Withdraw rejected: ${transactionId} by admin ${adminId}`);

      return {
        message: 'درخواست برداشت رد شد و مبلغ به کیف پول بازگشت',
        transaction: result.transaction,
        wallet: result.wallet,
      };
    }
  }

  /**
   * Get pending withdrawals (admin only)
   */
  async getPendingWithdrawals(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      type: 'WITHDRAW',
      status: 'PENDING',
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          wallet: {
            select: { userId: true },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPendingAmount = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      transactions,
      total,
      totalPendingAmount: totalPendingAmount._sum.amount || 0,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string) {
    const wallet = await this.getWallet(userId);

    const [
      depositResult,
      withdrawResult,
      paymentSentResult,
      paymentReceivedResult,
      bonusResult,
      thisMonthResult,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'DEPOSIT', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'WITHDRAW', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'PAYMENT', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      // Payments received - need to calculate from PAYMENT type where user received
      this.prisma.transaction.aggregate({
        where: {
          wallet: { userId },
          type: 'PAYMENT',
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'BONUS', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      // This month transactions
      this.prisma.transaction.aggregate({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      balance: wallet.balance,
      frozen: wallet.frozen,
      available: wallet.balance - wallet.frozen,
      totalDeposits: depositResult._sum.amount || 0,
      depositCount: depositResult._count,
      totalWithdrawals: withdrawResult._sum.amount || 0,
      withdrawalCount: withdrawResult._count,
      totalPaymentsSent: paymentSentResult._sum.amount || 0,
      paymentSentCount: paymentSentResult._count,
      totalPaymentsReceived: paymentReceivedResult._sum.amount || 0,
      paymentReceivedCount: paymentReceivedResult._count,
      totalBonuses: bonusResult._sum.amount || 0,
      bonusCount: bonusResult._count,
      thisMonthTotal: thisMonthResult._sum.amount || 0,
      thisMonthCount: thisMonthResult._count,
    };
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fa-IR').format(amount);
  }

  /**
   * Deduct pay-per-message AI agent fee inside an existing transaction (FOR UPDATE).
   */
  async deductAgentMessageFee(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      amount: number;
      idempotencyKey: string;
      referenceId: string;
    },
  ) {
    const existing = await tx.transaction.findFirst({
      where: { referenceId: params.idempotencyKey, type: 'PAYMENT', status: 'COMPLETED' },
    });
    if (existing) return { transaction: existing, duplicate: true as const };

    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

    let wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
    if (!wallet) wallet = await tx.wallet.create({ data: { userId: params.userId } });

    const available = wallet.balance - wallet.frozen;
    if (available < params.amount) {
      throw new PaymentRequiredException('INSUFFICIENT_BALANCE');
    }

    const updated = await tx.wallet.update({
      where: { userId: params.userId },
      data: { balance: { decrement: params.amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        walletId: updated.id,
        userId: params.userId,
        type: 'PAYMENT',
        amount: params.amount,
        status: 'COMPLETED',
        referenceId: params.idempotencyKey,
        description: `agent-message:${params.referenceId}`,
      },
    });
    return { transaction, duplicate: false as const };
  }

  /**
   * Refund AI agent message fee on LLM hard failure (idempotent).
   */
  async refundAgentMessageFee(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      amount: number;
      idempotencyKey: string;
      referenceId: string;
    },
  ) {
    const refundKey = `${params.idempotencyKey}:refund`;
    const existing = await tx.transaction.findFirst({
      where: { referenceId: refundKey, type: 'REFUND', status: 'COMPLETED' },
    });
    if (existing) return { transaction: existing, duplicate: true as const };

    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${params.userId} FOR UPDATE`;

    let wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
    if (!wallet) wallet = await tx.wallet.create({ data: { userId: params.userId } });

    const updated = await tx.wallet.update({
      where: { userId: params.userId },
      data: { balance: { increment: params.amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        walletId: updated.id,
        userId: params.userId,
        type: 'REFUND',
        amount: params.amount,
        status: 'COMPLETED',
        referenceId: refundKey,
        description: `agent-message-refund:${params.referenceId}`,
      },
    });
    return { transaction, duplicate: false as const };
  }
}
