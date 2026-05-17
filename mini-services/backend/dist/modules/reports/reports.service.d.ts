import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
export declare class ReportsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(reporterId: string, dto: CreateReportDto): Promise<{
        id: any;
        targetType: any;
        targetId: any;
        reason: any;
        description: any;
        isAnonymous: any;
        status: any;
        createdAt: any;
        reporter: {
            id: any;
            displayName: any;
            avatar: any;
        };
    }>;
    findAll(query: {
        status?: string;
        targetType?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    resolve(adminId: string, reportId: string, dto: ResolveReportDto): Promise<{
        id: any;
        targetType: any;
        targetId: any;
        status: any;
        resolution: any;
        action: "WARN" | "SUSPEND" | "BAN" | "NONE";
        resolvedBy: any;
        resolvedAt: any;
        message: string;
    }>;
    getByTarget(type: string, targetId: string): Promise<{
        data: any;
    }>;
    getStats(): Promise<{
        total: any;
        pending: any;
        byStatus: Record<string, number>;
        byTargetType: Record<string, number>;
    }>;
    private executeAction;
}
