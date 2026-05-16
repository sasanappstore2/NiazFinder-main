import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار داشبورد کاربر (محافظت شده)' })
  async getUserStats(@CurrentUser() user: any) {
    return this.dashboardService.getUserStats(user.id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار داشبورد مدیریت (فقط مدیران)' })
  async getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  @Get('chart/weekly')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نمودار هفتگی درخواست‌ها و پیشنهادها (محافظت شده)' })
  async getWeeklyChart(@CurrentUser() user: any) {
    return this.dashboardService.getWeeklyChart(user.id);
  }

  @Get('chart/monthly')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نمودار ماهانه درآمد و هزینه (محافظت شده)' })
  async getMonthlyChart(@CurrentUser() user: any) {
    return this.dashboardService.getMonthlyEarnings(user.id);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فعالیت‌های اخیر کاربر (محافظت شده)' })
  async getRecentActivity(@CurrentUser() user: any) {
    return this.dashboardService.getRecentActivity(user.id);
  }
}
