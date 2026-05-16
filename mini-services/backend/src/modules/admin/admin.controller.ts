import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { ManageRequestDto } from './dto/manage-request.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryAdminLogsDto } from './dto/query-admin-logs.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار کلی پنل مدیریت' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مدیریت کاربران (لیست، جستجو، فیلتر)' })
  @ApiQuery({ name: 'role', required: false, description: 'فیلتر نقش' })
  @ApiQuery({ name: 'status', required: false, description: 'فیلتر وضعیت' })
  @ApiQuery({ name: 'search', required: false, description: 'جستجو' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'مرتب‌سازی' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد در هر صفحه' })
  async getUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Put('users/:id/toggle-status')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فعال/غیرفعال کردن کاربر' })
  @ApiParam({ name: 'id', description: 'شناسه کاربر' })
  async toggleUserStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.adminService.toggleUserStatus(adminId, userId, dto);
  }

  @Put('requests/:id/manage')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مدیریت درخواست (ویژه، مخفی، تغییر وضعیت)' })
  @ApiParam({ name: 'id', description: 'شناسه درخواست' })
  async manageRequest(
    @CurrentUser('id') adminId: string,
    @Param('id') requestId: string,
    @Body() dto: ManageRequestDto,
  ) {
    return this.adminService.manageRequest(adminId, requestId, dto);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لاگ‌های سیستم و حسابرسی' })
  @ApiQuery({ name: 'adminId', required: false, description: 'شناسه ادمین' })
  @ApiQuery({ name: 'action', required: false, description: 'نوع عملیات' })
  @ApiQuery({ name: 'entity', required: false, description: 'نوع موجودیت' })
  @ApiQuery({ name: 'userId', required: false, description: 'شناسه کاربر' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'تاریخ شروع' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'تاریخ پایان' })
  async getAuditLogs(@Query() query: QueryAdminLogsDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('system-health')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'وضعیت سلامت سیستم' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Post('coupons')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد کد تخفیف' })
  async createCoupon(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.adminService.createCoupon(adminId, dto);
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست کدهای تخفیف' })
  async getCoupons() {
    return this.adminService.getCoupons();
  }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف کد تخفیف' })
  @ApiParam({ name: 'id', description: 'شناسه کد تخفیف' })
  async deleteCoupon(
    @CurrentUser('id') adminId: string,
    @Param('id') couponId: string,
  ) {
    return this.adminService.deleteCoupon(adminId, couponId);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مدیریت گزارش‌ها' })
  @ApiQuery({ name: 'status', required: false, description: 'فیلتر وضعیت' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد در هر صفحه' })
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReports({
      status,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فعالیت‌های اخیر پلتفرم' })
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }
}
