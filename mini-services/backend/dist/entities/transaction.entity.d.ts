import { BaseEntity } from './base.entity';
export declare enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    PAYMENT = "PAYMENT",
    REFUND = "REFUND",
    BONUS = "BONUS"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare class Transaction extends BaseEntity {
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    description: string;
    walletId: string;
    wallet: any;
    requestId: string | null;
    request: any | null;
    metadata: Record<string, unknown>;
}
