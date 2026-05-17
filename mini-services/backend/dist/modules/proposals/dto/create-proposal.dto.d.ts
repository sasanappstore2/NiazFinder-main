export declare class CreateProposalDto {
    requestId: string;
    coverLetter: string;
    estimatedBudget?: number;
    estimatedTime?: number;
    deliveryUnit?: 'day' | 'hour' | 'month';
}
