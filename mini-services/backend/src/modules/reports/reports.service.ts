import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new report
   */
  async create(reporterId: string, dto: CreateReportDto) {
    // Validate target exists based on type
    const targetTypeMap: Record<string, any> = {
      USER: this.prisma.user,
      REQUEST: this.prisma.serviceRequest,
      PROPOSAL: this.prisma.proposal,
    };

    const targetModel = targetTypeMap[dto.type];
    if (!targetModel) {
      throw new BadRequestException('نوع هدف گزارش نامعتبر است');
    }

    const targetExists = await targetModel.findUnique({
      where: { id: dto.targetId },
      select: { id: true },
    });

    if (!targetExists) {
      throw new NotFoundException('هدف گزارش یافت نشد');
    }

    // Prevent self-reporting users
    if (dto.type === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestException('نمی‌توانید خودتان را گزارش دهید');
    }

    // Check for duplicate report
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.type.toLowerCase(),
        targetId: dto.targetId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (existingReport) {
      throw new BadRequestException('شما قبلاً گزارشی برای این مورد ثبت کرده‌اید که در حال بررسی است');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.type.toLowerCase(),
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

    this.logger.log(`Report created: ${report.id} type=${dto.type} target=${dto.targetId}`);

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
            displayName:
              report.reporter.displayName ||
              `${report.reporter.firstName} ${report.reporter.lastName}`,
            avatar: report.reporter.avatar,
          },
    };
  }

  /**
   * List all reports (admin only)
   */
  async findAll(query: {
    status?: string;
    targetType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.targetType) {
      where.targetType = query.targetType.toLowerCase();
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
        resolution: report.resolution,
        resolvedBy: report.resolvedBy,
        resolvedAt: report.resolvedAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reporter: report.isAnonymous
          ? { id: 'anonymous', displayName: 'ناشناس', avatar: null }
          : {
              id: report.reporter.id,
              displayName:
                report.reporter.displayName ||
                `${report.reporter.firstName} ${report.reporter.lastName}`,
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

  /**
   * Resolve a report (admin only)
   */
  async resolve(adminId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('گزارش یافت نشد');
    }

    if (report.status !== 'PENDING' && report.status !== 'REVIEWING') {
      throw new BadRequestException('این گزارش قبلاً بررسی شده است');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'RESOLVED',
          resolution: dto.resolution,
          resolvedBy: adminId,
          resolvedAt: now,
        },
      });

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId,
          action: `RESOLVE_REPORT`,
          target: `Report:${reportId}`,
          details: JSON.stringify({
            reportId,
            targetType: report.targetType,
            targetId: report.targetId,
            resolution: dto.resolution,
            action: dto.action,
            adminNote: dto.adminNote,
          }),
        },
      });

      return updatedReport;
    });

    // Execute action based on resolution
    await this.executeAction(report.targetType, report.targetId, dto.action, adminId, dto.adminNote);

    // Notify reporter that report was resolved
    if (!report.isAnonymous) {
      await this.prisma.notification.create({
        data: {
          userId: report.reporter.id,
          type: 'REPORT_RESOLVED',
          title: 'گزارش شما بررسی شد',
          message: 'گزارشی که ثبت کرده بودید بررسی و نتیجه آن مشخص شد',
          data: JSON.stringify({
            reportId,
            resolution: dto.resolution,
            action: dto.action,
          }),
        },
      });
    }

    this.logger.log(
      `Report resolved: ${reportId} action=${dto.action} by admin ${adminId}`,
    );

    const actionMessages: Record<string, string> = {
      WARN: 'اخطار ارسال شد',
      SUSPEND: 'حساب کاربری معلق شد',
      BAN: 'حساب کاربری مسدود شد',
      NONE: 'بدون اقدام تنبیهی',
    };

    return {
      id: result.id,
      targetType: result.targetType,
      targetId: result.targetId,
      status: result.status,
      resolution: result.resolution,
      action: dto.action,
      resolvedBy: result.resolvedBy,
      resolvedAt: result.resolvedAt,
      message: `گزارش بررسی و حل شد. ${actionMessages[dto.action]}`,
    };
  }

  /**
   * Get reports for a specific entity
   */
  async getByTarget(type: string, targetId: string) {
    const normalizedType = type.toLowerCase();
    const validTypes = ['user', 'request', 'proposal', 'review'];

    if (!validTypes.includes(normalizedType)) {
      throw new BadRequestException('نوع هدف نامعتبر است');
    }

    const reports = await this.prisma.report.findMany({
      where: { targetType: normalizedType, targetId },
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
        resolution: report.resolution,
        resolvedAt: report.resolvedAt,
        createdAt: report.createdAt,
        reporter: report.isAnonymous
          ? { id: 'anonymous', displayName: 'ناشناس', avatar: null }
          : {
              id: report.reporter.id,
              displayName:
                report.reporter.displayName ||
                `${report.reporter.firstName} ${report.reporter.lastName}`,
              avatar: report.reporter.avatar,
            },
      })),
    };
  }

  /**
   * Get reports statistics
   */
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

  /**
   * Execute action on reported entity (warn, suspend, ban)
   */
  private async executeAction(
    targetType: string,
    targetId: string,
    action: string,
    adminId: string,
    reason?: string,
  ) {
    if (action === 'NONE') return;

    if (targetType !== 'user') return;

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });

    if (!user) return;

    // Don't action on admins
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return;

    let updateData: any = {};

    switch (action) {
      case 'WARN':
        await this.prisma.notification.create({
          data: {
            userId: targetId,
            type: 'WARNING',
            title: 'اخطار از مدیریت',
            message: `شما یک اخطار از سوی مدیریت دریافت کرده‌اید. دلیل: ${reason || 'نامشخص'}`,
            data: JSON.stringify({ reportTargetId: targetId, adminId }),
          },
        });
        break;

      case 'SUSPEND':
        updateData = { isActive: false };
        await this.prisma.user.update({
          where: { id: targetId },
          data: updateData,
        });
        break;

      case 'BAN':
        updateData = {
          isBanned: true,
          banReason: reason || 'تخلف از قوانین پلتفرم',
          isActive: false,
        };
        await this.prisma.user.update({
          where: { id: targetId },
          data: updateData,
        });
        await this.prisma.notification.create({
          data: {
            userId: targetId,
            type: 'BAN',
            title: 'حساب کاربری مسدود شد',
            message: `حساب کاربری شما مسدود شده است. دلیل: ${reason || 'بدون دلیل'}`,
            data: JSON.stringify({ reason }),
          },
        });
        break;
    }

    if (action !== 'WARN') {
      await this.prisma.adminLog.create({
        data: {
          adminId,
          action: `REPORT_ACTION_${action}`,
          target: `User:${targetId}`,
          details: JSON.stringify({ targetType, targetId, action, reason }),
        },
      });
    }
  }
}
