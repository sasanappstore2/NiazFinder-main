import { BaseEntity } from './base.entity';
export declare enum ReportType {
    USER = "USER",
    REQUEST = "REQUEST",
    PROPOSAL = "PROPOSAL"
}
export declare enum ReportStatus {
    PENDING = "PENDING",
    REVIEWED = "REVIEWED",
    RESOLVED = "RESOLVED"
}
export declare class Report extends BaseEntity {
    reason: string;
    description: string;
    type: ReportType;
    reporterId: string;
    reporter: any;
    targetId: string;
    status: ReportStatus;
    resolverId: string | null;
    resolver: any | null;
    resolution: string | null;
    adminNote: string | null;
    resolvedAt: Date | null;
}
