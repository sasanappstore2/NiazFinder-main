export declare class UpdateRequestDto {
    title?: string;
    description?: string;
    categoryId?: string;
    budgetMin?: number;
    budgetMax?: number;
    budgetType?: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
    deliveryTime?: number;
    deliveryUnit?: 'day' | 'hour' | 'month';
    city?: string;
    province?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    status?: string;
    tags?: string[];
}
