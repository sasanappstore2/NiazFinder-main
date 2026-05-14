import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const validTargets: Record<string, any> = {
      user: this.prisma.user.findUnique({ where: { id: dto.targetId }, select: { id: true } }),
      request: this.prisma.serviceRequest.findUnique({ where: { id: dto.targetId }, select: { id: true } }),
      proposal: this.prisma.proposal.findUnique({ where: { id: dto.targetId }, select: { id: true } }),
      review: this.prisma.review.findUnique({ where: { id: dto.targetId }, select: { id: true } }),
    };

    const target = await validTargets[dto.targetType];
    if (!target) {
      throw new BadRequestException('نوع هدف گزارش نامعتبر است');
    }

    const targetExists = await target;
    if (!targetExists) {
      throw new NotFoundException('هدف گزارش یافت نشد');
    }

    // Prevent self-reporting users
    if (dto.targetType === 'user' && dto.targetId === reporterId) {
      throw new BadRequestException('نمی‌توانید خودتان را گزارش دهید');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description || null,
        isAnonymous: dto.isAnonymous || false,
        status: 'PENDING',
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      isAnonymous: report.isAnonymous,
      status: report.status,
      createdAt: report.createdAt,
      reporter: report.isAnonymous
        ? { id: 'anonymous', displayName: 'ناشناس', avatar: null }
        : {
            id: report.reporter.id,
            displayName: report.reporter.displayName || `${report.reporter.firstName} ${report.reporter.lastName}`,
            avatar: report.reporter.avatar,
          },
    };
  }

  async findAll(query: { status?: string; targetType?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports.map((report) => ({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        description: report.description,
        isAnonymous: report.isAnonymous,
        status: report.status,
        resolvedBy: report.resolvedBy,
        resolvedAt: report.resolvedAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reporter: report.isAnonymous
          ? { id: 'anonymous', displayName: 'ناشناس', avatar: null }
          : {
              id: report.reporter.id,
              displayName: report.reporter.displayName || `${report.reporter.firstName} ${report.reporter.lastName}`,
              avatar: report.reporter.avatar,
            },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolve(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('گزارش یافت نشد');
    }

    if (report.status !== 'PENDING' && report.status !== 'REVIEWING') {
      throw new BadRequestException('این گزارش قبلاً بررسی شده است');
    }

    const now = new Date();
    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolvedBy: adminId,
        resolvedAt: now,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Create admin log
    await this.prisma.adminLog.create({
      data: {
        adminId,
        action: `RESOLVE_REPORT_${dto.status}`,
        target: `Report:${reportId}`,
        details: dto.adminNote || `گزارش ${reportId} با وضعیت ${dto.status} بسته شد`,
      },
    });

    return {
      id: updatedReport.id,
      targetType: updatedReport.targetType,
      targetId: updatedReport.targetId,
      status: updatedReport.status,
      resolvedBy: updatedReport.resolvedBy,
      resolvedAt: updatedReport.resolvedAt,
      message: `گزارش با موفقیت ${dto.status === 'RESOLVED' ? 'بررسی و حل' : 'رد'} شد`,
    };
  }

  async getByTarget(targetType: string, targetId: string) {
    const reports = await this.prisma.report.findMany({
      where: { targetType, targetId },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        description: report.description,
        isAnonymous: report.isAnonymous,
        status: report.status,
        resolvedAt: report.resolvedAt,
        createdAt: report.createdAt,
        reporter: report.isAnonymous
          ? { id: 'anonymous', displayName: 'ناشناس', avatar: null }
          : {
              id: report.reporter.id,
              displayName: report.reporter.displayName || `${report.reporter.firstName} ${report.reporter.lastName}`,
              avatar: report.reporter.avatar,
            },
      })),
    };
  }

  async getStats() {
    const [byStatus, byTargetType, total, pendingCount] = await Promise.all([
      this.prisma.report.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.report.groupBy({
        by: ['targetType'],
        _count: { targetType: true },
      }),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((item) => {
      statusMap[item.status] = item._count.status;
    });

    const targetTypeMap: Record<string, number> = {};
    byTargetType.forEach((item) => {
      targetTypeMap[item.targetType] = item._count.targetType;
    });

    return {
      total,
      pending: pendingCount,
      byStatus: statusMap,
      byTargetType: targetTypeMap,
    };
  }
}
