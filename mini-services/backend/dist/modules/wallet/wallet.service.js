"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WalletService = WalletService_1 = class WalletService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WalletService_1.name);
    }
    async getWallet(userId) {
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
    async getBalance(userId) {
        const wallet = await this.getWallet(userId);
        return {
            balance: wallet.balance,
            frozen: wallet.frozen,
            available: wallet.balance - wallet.frozen,
        };
    }
    async getTransactions(userId, query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (query.type) {
            where.type = query.type;
        }
        if (query.status) {
            where.status = query.status;
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
    async deposit(userId, dto) {
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
    async withdraw(userId, dto) {
        const wallet = await this.getWallet(userId);
        const availableBalance = wallet.balance - wallet.frozen;
        if (availableBalance < dto.amount) {
            throw new common_1.BadRequestException(`موجودی قابل برداشت کافی نیست. موجودی فعلی: ${this.formatAmount(availableBalance)} ریال`);
        }
        if (dto.amount < 50000) {
            throw new common_1.BadRequestException('حداقل مبلغ برداشت ۵۰,۰۰۰ ریال است');
        }
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
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { decrement: dto.amount },
                    frozen: { increment: dto.amount },
                },
            });
            return { transaction: newTx, wallet: updatedWallet };
        });
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
    async transfer(fromUserId, toUserId, amount, description, requestId) {
        const toUser = await this.prisma.user.findUnique({
            where: { id: toUserId },
            select: { id: true, isActive: true, isBanned: true },
        });
        if (!toUser) {
            throw new common_1.NotFoundException('کاربر گیرنده یافت نشد');
        }
        if (!toUser.isActive || toUser.isBanned) {
            throw new common_1.BadRequestException('کاربر گیرنده فعال نیست');
        }
        if (fromUserId === toUserId) {
            throw new common_1.BadRequestException('نمی‌توانید به خودتان منتقل کنید');
        }
        const senderWallet = await this.getWallet(fromUserId);
        if (senderWallet.balance < amount) {
            throw new common_1.BadRequestException('موجودی کیف پول کافی نیست');
        }
        const receiverWallet = await this.getWallet(toUserId);
        const result = await this.prisma.$transaction(async (tx) => {
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
    async freeze(userId, amount) {
        const wallet = await this.getWallet(userId);
        const availableBalance = wallet.balance - wallet.frozen;
        if (availableBalance < amount) {
            throw new common_1.BadRequestException(`موجودی قابل فریز کافی نیست. موجودی فعلی: ${this.formatAmount(availableBalance)} ریال`);
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
    async unfreeze(userId, amount) {
        const wallet = await this.getWallet(userId);
        if (wallet.frozen < amount) {
            throw new common_1.BadRequestException('مبلغ فریز شده کافی نیست');
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
    async processWithdrawal(transactionId, adminId, approve) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                wallet: {
                    select: { id: true, userId: true, frozen: true },
                },
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('تراکنش مورد نظر یافت نشد');
        }
        if (transaction.type !== 'WITHDRAW') {
            throw new common_1.BadRequestException('این تراکنش مربوط به برداشت نیست');
        }
        if (transaction.status !== 'PENDING') {
            throw new common_1.BadRequestException('این درخواست برداشت قبلاً پردازش شده است');
        }
        if (approve) {
            const result = await this.prisma.$transaction(async (tx) => {
                const updatedTx = await tx.transaction.update({
                    where: { id: transactionId },
                    data: { status: 'COMPLETED' },
                });
                const updatedWallet = await tx.wallet.update({
                    where: { id: transaction.wallet.id },
                    data: { frozen: { decrement: transaction.amount } },
                });
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
        }
        else {
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
    async getPendingWithdrawals(query) {
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
    async getWalletStats(userId) {
        const wallet = await this.getWallet(userId);
        const [depositResult, withdrawResult, paymentSentResult, paymentReceivedResult, bonusResult, thisMonthResult,] = await Promise.all([
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
    formatAmount(amount) {
        return new Intl.NumberFormat('fa-IR').format(amount);
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map