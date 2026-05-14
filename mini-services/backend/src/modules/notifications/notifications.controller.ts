import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست اعلان‌ها', description: 'دریافت لیست اعلان‌های کاربر با صفحه‌بندی' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه', type: Number })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll(user.id, { page: Number(page), limit: Number(limit) });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد اعلان‌های خوانده نشده', description: 'دریافت تعداد اعلان‌های خوانده نشده کاربر' })
  async getUnreadCount(
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'ایجاد اعلان', description: 'ایجاد اعلان جدید (فقط مدیران)' })
  @Roles('ADMIN')
  async create(
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(dto.userId, dto);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'خواندن تمام اعلان‌ها', description: 'علامت‌گذاری تمام اعلان‌های خوانده نشده' })
  async markAllAsRead(
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'خواندن اعلان', description: 'علامت‌گذاری یک اعلان به عنوان خوانده شده' })
  @ApiParam({ name: 'id', description: 'شناسه اعلان' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف اعلان', description: 'حذف یک اعلان' })
  @ApiParam({ name: 'id', description: 'شناسه اعلان' })
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.delete(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'حذف تمام اعلان‌ها', description: 'حذف تمام اعلان‌های کاربر' })
  async deleteAll(
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.deleteAll(user.id);
  }
}
