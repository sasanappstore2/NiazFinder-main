export declare class CreateCouponDto {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minOrder?: number;
    maxUses?: number;
    startsAt?: string;
    expiresAt?: string;
}
