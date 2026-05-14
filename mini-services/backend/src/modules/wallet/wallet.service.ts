import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

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

  async charge(userId: string, dto: ChargeDto) {
    const wallet = await this.getWallet(userId);

    // Simulate payment: create DEPOSIT transaction with COMPLETED status
    const transaction = await this.prisma.$transaction(async (tx) => {
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

    return {
      message: 'کیف پول شما با موفقیت شارژ شد',
      transaction: transaction.transaction,
      wallet: transaction.wallet,
    };
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const wallet = await this.getWallet(userId);

    const availableBalance = wallet.balance - wallet.frozen;

    if (availableBalance < dto.amount) {
      throw new BadRequestException(
        `موجودی قابل برداشت کافی نیست. موجودی فعلی: ${this.formatAmount(availableBalance)} ریال`,
      );
    }

    // Create WITHDRAW transaction with PENDING status (requires admin approval)
    const result = await this.prisma.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'WITHDRAW',
          amount: dto.amount,
          description: dto.description || 'برداشت از کیف پول',
          status: 'PENDING',
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

    return {
      message: 'درخواست برداشت شما با موفقیت ثبت شد و پس از تأیید مدیریت پرداخت خواهد شد',
      transaction: result.transaction,
      wallet: result.wallet,
    };
  }

  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string,
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
      // Create ESCROW_HOLD for sender
      const senderTx = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          userId: fromUserId,
          type: 'PAYMENT',
          amount,
          description: description || `پرداخت به کاربر ${toUserId}`,
          referenceId: toUserId,
          status: 'COMPLETED',
        },
      });

      // Create ESCROW_RELEASE for receiver
      const receiverTx = await tx.transaction.create({
        data: {
          walletId: receiverWallet.id,
          userId: toUserId,
          type: 'PAYMENT',
          amount,
          description: description || `دریافت از کاربر ${fromUserId}`,
          referenceId: fromUserId,
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

    return {
      message: 'انتقال وجه با موفقیت انجام شد',
      ...result,
    };
  }

  async getBalance(userId: string) {
    const wallet = await this.getWallet(userId);

    return {
      balance: wallet.balance,
      frozen: wallet.frozen,
      available: wallet.balance - wallet.frozen,
    };
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fa-IR').format(amount);
  }
}
