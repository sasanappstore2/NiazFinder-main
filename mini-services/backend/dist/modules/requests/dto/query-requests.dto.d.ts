export declare class QueryRequestsDto {
    page?: number;
    limit?: number;
    categoryId?: string;
    city?: string;
    province?: string;
    status?: string;
    priority?: string;
    search?: string;
    sort?: 'newest' | 'oldest' | 'budget_low' | 'budget_high' | 'most_proposals';
}
