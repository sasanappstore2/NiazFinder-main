import { WalletService } from './wallet.service';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getWallet(user: any): Promise<{
        balance: any;
        frozen: any;
        available: number;
    }>;
    getTransactions(user: any, query: QueryTransactionsDto): Promise<{
        transactions: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getWalletStats(user: any): Promise<{
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
    deposit(user: any, dto: ChargeDto): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    withdraw(user: any, dto: WithdrawDto): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    transfer(user: any, body: {
        toUserId: string;
        amount: number;
        description?: string;
        requestId?: string;
    }): Promise<any>;
    getPendingWithdrawals(page?: string, limit?: string): Promise<{
        transactions: any;
        total: any;
        totalPendingAmount: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    approveWithdrawal(transactionId: string, user: any): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
    rejectWithdrawal(transactionId: string, user: any): Promise<{
        message: string;
        transaction: any;
        wallet: any;
    }>;
}
