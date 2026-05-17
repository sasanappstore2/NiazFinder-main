export declare class ResolveReportDto {
    resolution: string;
    action: 'WARN' | 'SUSPEND' | 'BAN' | 'NONE';
    adminNote?: string;
}
