export declare class CreateReportDto {
    type: 'USER' | 'REQUEST' | 'PROPOSAL';
    targetId: string;
    reason: string;
    description?: string;
    isAnonymous?: boolean;
}
