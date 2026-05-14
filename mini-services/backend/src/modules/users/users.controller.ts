import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جستجوی کاربران' })
  @ApiResponse({ status: 200, description: 'نتایج جستجو' })
  async searchUsers(
    @Query('q') q: string,
  ) {
    if (!q || q.trim().length === 0) {
      return { users: [], message: 'عبارت جستجو نمی‌تواند خالی باشد' };
    }
    return this.usersService.search(q.trim());
  }

  @Get('specialists')
  @ApiOperation({ summary: 'لیست متخصص‌ها' })
  @ApiResponse({ status: 200, description: 'لیست متخصص‌ها با صفحه‌بندی' })
  async getSpecialists(@Query() query: QueryUsersDto) {
    const specialistQuery = { ...query, role: 'SPECIALIST' } as QueryUsersDto;
    return this.usersService.findAll(specialistQuery);
  }

  @Get('specialists/:id')
  @ApiOperation({ summary: 'پروفایل کامل متخصص' })
  @ApiResponse({ status: 200, description: 'اطلاعات متخصص' })
  @ApiResponse({ status: 404, description: 'متخصص یافت نشد' })
  async getSpecialistProfile(@Param('id') id: string) {
    return this.usersService.getSpecialistProfile(id);
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار داشبورد کاربر' })
  @ApiResponse({ status: 200, description: 'آمار کاربر' })
  @ApiResponse({ status: 401, description: 'احراز هویت ناموفق' })
  async getDashboardStats(@CurrentUser() user: any) {
    return this.usersService.getDashboardStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده پروفایل کاربر' })
  @ApiResponse({ status: 200, description: 'اطلاعات کاربر' })
  @ApiResponse({ status: 404, description: 'کاربر یافت نشد' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

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
}
