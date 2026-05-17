export declare function createSlug(text: string): string;
export declare function generateReferralCode(): string;
export declare function daysFromNow(days: number): Date;
export declare function formatPrice(amount: number): string;
export declare function generateOtpCode(length?: number): string;
export declare function sanitizeHtml(text: string): string;
export declare function truncate(text: string, maxLength?: number): string;
export declare function calculatePaginationMeta(total: number, page: number, limit: number): {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};
export declare function extractClientInfo(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
}): {
    ipAddress: string;
    userAgent: string;
};
