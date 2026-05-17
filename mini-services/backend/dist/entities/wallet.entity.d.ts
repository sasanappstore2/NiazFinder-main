import { BaseEntity } from './base.entity';
export declare class Wallet extends BaseEntity {
    balance: number;
    frozen: number;
    userId: string;
    user: any;
    transactions: any[];
}
