export declare class AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    userId: string | null;
    user: any | null;
    changes: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
