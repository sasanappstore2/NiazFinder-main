import { IsEmail, IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── JWT Payload ───
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ─── Pagination ───
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }

  get take(): number {
    return this.limit || 10;
  }
}

export class PaginatedResponse<T> {
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

// ─── Sort ───
export class SortDto {
  @ApiPropertyOptional({ default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// ─── Cursor Pagination ───
export class CursorPaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}

// ─── Common Response ───
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

// ─── WebSocket Events ───
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

// ─── Health Check ───
export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

// ─── User Roles ───
export enum UserRole {
  CLIENT = 'CLIENT',
  SPECIALIST = 'SPECIALIST',
  ADMIN = 'ADMIN',
}

// ─── Request/Proposal Statuses ───
export enum RequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ProposalStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum BudgetType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
  NEGOTIABLE = 'NEGOTIABLE',
}

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  PROPOSAL = 'PROPOSAL',
  REVIEW = 'REVIEW',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
}

export enum ReportType {
  USER = 'USER',
  REQUEST = 'REQUEST',
  PROPOSAL = 'PROPOSAL',
}
