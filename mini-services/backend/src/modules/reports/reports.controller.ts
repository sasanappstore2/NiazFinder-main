import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد گزارش', description: 'ایجاد گزارش جدید برای هدف مشخص' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست گزارش‌ها', description: 'دریافت لیست تمام گزارش‌ها (فقط مدیران)' })
  @ApiQuery({ name: 'status', required: false, description: 'فیلتر وضعیت', enum: ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'] })
  @ApiQuery({ name: 'targetType', required: false, description: 'فیلتر نوع هدف', enum: ['user', 'request', 'proposal', 'review'] })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه', type: Number })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.findAll({
      status,
      targetType,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'آمار گزارش‌ها', description: 'دریافت آمار گزارش‌ها بر اساس وضعیت و نوع هدف (فقط مدیران)' })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getStats() {
    return this.reportsService.getStats();
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'بررسی گزارش', description: 'بررسی و حل یا رد گزارش (فقط مدیران)' })
  @ApiParam({ name: 'id', description: 'شناسه گزارش' })
  @Roles('ADMIN', 'SUPER_ADMIN')
  async resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolve(user.id, id, dto);
  }
}
