export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export declare class PaginationDto {
    page?: number;
    limit?: number;
    get skip(): number;
    get take(): number;
}
export declare class PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export declare class SortDto {
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export declare class CursorPaginationDto {
    cursor?: string;
    limit?: number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    statusCode?: number;
    errors?: string[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface WsMessage<T = unknown> {
    event: string;
    data: T;
    senderId?: string;
    timestamp: string;
}
export interface WsUser {
    id: string;
    email: string;
    role: string;
}
export interface HealthStatus {
    status: 'ok' | 'error' | 'degraded';
    info?: Record<string, unknown>;
    error?: Record<string, unknown>;
    details?: Record<string, unknown>;
}
export declare enum UserRole {
    CLIENT = "CLIENT",
    SPECIALIST = "SPECIALIST",
    ADMIN = "ADMIN"
}
export declare enum RequestStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}
export declare enum ProposalStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    WITHDRAWN = "WITHDRAWN"
}
export declare enum BudgetType {
    FIXED = "FIXED",
    HOURLY = "HOURLY",
    NEGOTIABLE = "NEGOTIABLE"
}
export declare enum NotificationType {
    MESSAGE = "MESSAGE",
    PROPOSAL = "PROPOSAL",
    REVIEW = "REVIEW",
    PAYMENT = "PAYMENT",
    SYSTEM = "SYSTEM"
}
export declare enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    PAYMENT = "PAYMENT",
    REFUND = "REFUND",
    BONUS = "BONUS"
}
export declare enum ReportType {
    USER = "USER",
    REQUEST = "REQUEST",
    PROPOSAL = "PROPOSAL"
}
