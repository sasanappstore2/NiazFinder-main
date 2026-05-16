import {
  Controller,
  Get,
  Post,
  Put,
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
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد گزارش (محافظت شده)' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست گزارش‌ها (فقط مدیران)' })
  @ApiQuery({ name: 'status', required: false, description: 'فیلتر وضعیت', enum: ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'] })
  @ApiQuery({ name: 'targetType', required: false, description: 'فیلتر نوع هدف', enum: ['user', 'request', 'proposal'] })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه', type: Number })
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

  @Put(':id/resolve')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بررسی و حل گزارش (فقط مدیران)' })
  @ApiParam({ name: 'id', description: 'شناسه گزارش' })
  async resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolve(user.id, id, dto);
  }

  @Get('target/:type/:targetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'گزارش‌های مربوط به یک موجودیت' })
  @ApiParam({ name: 'type', description: 'نوع هدف (user, request, proposal)' })
  @ApiParam({ name: 'targetId', description: 'شناسه هدف' })
  async getByTarget(
    @Param('type') type: string,
    @Param('targetId') targetId: string,
  ) {
    return this.reportsService.getByTarget(type, targetId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار گزارش‌ها (فقط مدیران)' })
  async getStats() {
    return this.reportsService.getStats();
  }
}
