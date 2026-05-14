import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'دریافت آمار کلی پنل مدیریت' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست کاربران با فیلتر' })
  async getUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر وضعیت کاربر' })
  async toggleUserStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.adminService.toggleUserStatus(adminId, userId, dto);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لاگ‌های سیستم' })
  async getSystemLogs(@Query() query: QueryAdminLogsDto) {
    return this.adminService.getSystemLogs(query);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فعالیت‌های اخیر' })
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  @Patch('requests/:id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مدیریت درخواست' })
  async manageRequest(
    @CurrentUser('id') adminId: string,
    @Param('id') requestId: string,
    @Body() dto: ManageRequestDto,
  ) {
    return this.adminService.manageRequest(adminId, requestId, dto);
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست کدهای تخفیف' })
  async getCoupons() {
    return this.adminService.getCoupons();
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

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف کد تخفیف' })
  async deleteCoupon(
    @CurrentUser('id') adminId: string,
    @Param('id') couponId: string,
  ) {
    return this.adminService.deleteCoupon(adminId, couponId);
  }
}
