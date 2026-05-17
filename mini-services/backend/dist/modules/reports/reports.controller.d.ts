import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    create(user: any, dto: CreateReportDto): Promise<{
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
    findAll(status?: string, targetType?: string, page?: string, limit?: string): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    resolve(user: any, id: string, dto: ResolveReportDto): Promise<{
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
}
