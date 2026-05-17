import { BaseEntity } from './base.entity';
export declare enum ReferralStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED"
}
export declare class Referral extends BaseEntity {
    referrerId: string;
    referrer: any;
    referredId: string;
    referred: any;
    code: string;
    status: ReferralStatus;
    reward: number;
    rewardPaid: boolean;
}
