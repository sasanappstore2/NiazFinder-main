import { PrismaService } from '../../prisma/prisma.service';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
export declare class WalletService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getWallet(userId: string): Promise<any>;
    getBalance(userId: string): Promise<{
        balance: any;
        frozen: any;
        available: number;
    }>;
    getTransactions(userId: string, query: QueryTransactionsDto): Promise<{
        transactions: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    deposit(userId: string, dto: ChargeDto): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    withdraw(userId: string, dto: WithdrawDto): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    transfer(fromUserId: string, toUserId: string, amount: number, description?: string, requestId?: string): Promise<any>;
    freeze(userId: string, amount: number): Promise<any>;
    unfreeze(userId: string, amount: number): Promise<any>;
    processWithdrawal(transactionId: string, adminId: string, approve: boolean): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    getPendingWithdrawals(query: {
        page?: number;
        limit?: number;
    }): Promise<{
        transactions: any;
        total: any;
        totalPendingAmount: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getWalletStats(userId: string): Promise<{
        balance: any;
        frozen: any;
        available: number;
        totalDeposits: any;
        depositCount: any;
        totalWithdrawals: any;
        withdrawalCount: any;
        totalPaymentsSent: any;
        paymentSentCount: any;
        totalPaymentsReceived: any;
        paymentReceivedCount: any;
        totalBonuses: any;
        bonusCount: any;
        thisMonthTotal: any;
        thisMonthCount: any;
    }>;
    private formatAmount;
}
