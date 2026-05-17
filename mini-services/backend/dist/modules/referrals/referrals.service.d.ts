import { PrismaService } from '../../prisma/prisma.service';
export declare class ReferralsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateReferralCode(userId: string): Promise<{
        code: any;
    }>;
    getMyReferralInfo(userId: string): Promise<{
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
    applyReferral(userId: string, code: string): Promise<{
        message: string;
        data: {
            code: string;
            reward: number;
        };
    }>;
    getReferralStats(userId: string): Promise<{
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
    processReward(referralId: string): Promise<{
        message: string;
        data: any;
    }>;
    getLeaderboard(): Promise<any>;
}
