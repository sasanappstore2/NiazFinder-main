import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== Admin: List Users ====================

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'لیست کاربران (مدیر)' })
  @ApiResponse({ status: 200, description: 'لیست کاربران با صفحه‌بندی' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.adminGetAll(query);
  }

  // ==================== Search Users ====================

  @Get('search')
  @ApiOperation({ summary: 'جستجوی کاربران' })
  @ApiResponse({ status: 200, description: 'نتایج جستجو' })
  async searchUsers(@Query() query: SearchUsersDto) {
    return this.usersService.searchUsers(query.query);
  }

  // ==================== Current User Profile ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پروفایل کاربر فعلی' })
  @ApiResponse({ status: 200, description: 'اطلاعات کاربر فعلی' })
  @ApiResponse({ status: 401, description: 'احراز هویت ناموفق' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  // ==================== Update Current User Profile ====================

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی پروفایل کاربر فعلی' })
  @ApiResponse({ status: 200, description: 'پروفایل بروزرسانی شد' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ==================== Update Avatar ====================

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بروزرسانی آواتار کاربر' })
  @ApiResponse({ status: 200, description: 'آواتار بروزرسانی شد' })
  async updateAvatar(
    @CurrentUser() user: any,
    @Body() body: { avatarUrl: string },
  ) {
    return this.usersService.updateAvatar(user.id, body.avatarUrl);
  }

  // ==================== Change Password ====================

  @Put('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر رمز عبور' })
  @ApiResponse({ status: 200, description: 'رمز عبور تغییر کرد' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  // ==================== Profile Completion ====================

  @Get('me/completion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درصد تکمیل پروفایل' })
  @ApiResponse({ status: 200, description: 'درصد تکمیل پروفایل' })
  async getProfileCompletion(@CurrentUser() user: any) {
    return this.usersService.getProfileCompletion(user.id);
  }

  // ==================== Dashboard Stats ====================

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار داشبورد کاربر' })
  @ApiResponse({ status: 200, description: 'آمار کاربر' })
  @ApiResponse({ status: 401, description: 'احراز هویت ناموفق' })
  async getDashboardStats(@CurrentUser() user: any) {
    return this.usersService.getDashboardStats(user.id);
  }

  // ==================== Public: Get User Profile ====================

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده پروفایل کاربر (عمومی)' })
  @ApiResponse({ status: 200, description: 'اطلاعات کاربر' })
  @ApiResponse({ status: 404, description: 'کاربر یافت نشد' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ==================== Admin: Deactivate User ====================

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'غیرفعال‌سازی کاربر (مدیر)' })
  @ApiResponse({ status: 200, description: 'کاربر غیرفعال شد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'کاربر یافت نشد' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  // ==================== Admin: Toggle Status ====================

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر وضعیت کاربر (مدیر)' })
  @ApiResponse({ status: 200, description: 'وضعیت کاربر تغییر کرد' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'کاربر یافت نشد' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() data: { isActive?: boolean; isBanned?: boolean; banReason?: string },
  ) {
    return this.usersService.adminToggleStatus(id, data);
  }

  // ==================== Public: Specialist Profile ====================

  @Get('specialists/:id')
  @ApiOperation({ summary: 'پروفایل کامل کسب‌وکار' })
  @ApiResponse({ status: 200, description: 'اطلاعات کسب‌وکار' })
  @ApiResponse({ status: 404, description: 'کسب‌وکار یافت نشد' })
  async getSpecialistProfile(@Param('id') id: string) {
    return this.usersService.getSpecialistProfile(id);
  }
}
