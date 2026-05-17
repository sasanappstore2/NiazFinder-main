import { ReferralsService } from './referrals.service';
import { ApplyReferralDto } from './dto/apply-referral.dto';
export declare class ReferralsController {
    private readonly referralsService;
    constructor(referralsService: ReferralsService);
    getMyReferralInfo(user: any): Promise<{
        code: string;
        referralLink: string;
        stats: {
            totalReferred: any;
            completedReferrals: any;
            totalEarned: any;
            claimedRewards: any;
            pendingRewards: number;
        };
    }>;
    getReferralStats(user: any): Promise<{
        totalReferred: any;
        totalEarned: any;
        claimedRewards: any;
        pendingRewards: any;
        completedReferrals: any;
        conversionRate: number;
        monthlyBreakdown: {
            month: string;
            count: number;
            reward: number;
        }[];
        referrals: any;
    }>;
    getLeaderboard(): Promise<any>;
    applyReferralCode(user: any, dto: ApplyReferralDto): Promise<{
        message: string;
        data: {
            code: string;
            reward: number;
        };
    }>;
    claimReward(user: any, referralId: string): Promise<{
        message: string;
        data: any;
    }>;
}
