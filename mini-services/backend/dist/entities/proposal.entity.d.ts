import { BaseEntity } from './base.entity';
export declare enum ProposalDeliveryUnit {
    DAY = "day",
    HOUR = "hour",
    MONTH = "month"
}
export declare enum ProposalStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    WITHDRAWN = "WITHDRAWN"
}
export declare class Proposal extends BaseEntity {
    coverLetter: string;
    estimatedBudget: number | null;
    estimatedTime: number | null;
    deliveryUnit: ProposalDeliveryUnit;
    status: ProposalStatus;
    requestId: string;
    request: any;
    specialistId: string;
    specialist: any;
    review: any | null;
}
