import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'لیست علاقه‌مندی‌های کاربر' })
  @ApiResponse({ status: 200, description: 'لیست علاقه‌مندی‌ها' })
  @ApiResponse({ status: 401, description: 'احراز هویت ناموفق' })
  async getUserBookmarks(@CurrentUser() user: any, @Query() query: QueryBookmarksDto) {
    return this.bookmarksService.getUserBookmarks(user.id, query);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'افزودن/حذف علاقه‌مندی' })
  @ApiResponse({ status: 200, description: 'عملیات علاقه‌مندی انجام شد' })
  async toggleBookmark(@CurrentUser() user: any, @Body() dto: ToggleBookmarkDto) {
    return this.bookmarksService.toggleBookmark(user.id, dto);
  }

  @Get('check/:type/:targetId')
  @ApiOperation({ summary: 'بررسی وضعیت علاقه‌مندی' })
  @ApiResponse({ status: 200, description: 'وضعیت علاقه‌مندی' })
  async checkBookmark(
    @CurrentUser() user: any,
    @Param('type') type: string,
    @Param('targetId') targetId: string,
  ) {
    return this.bookmarksService.isBookmarked(user.id, type, targetId);
  }

  @Delete(':type/:targetId')
  @ApiOperation({ summary: 'حذف علاقه‌مندی' })
  @ApiResponse({ status: 200, description: 'علاقه‌مندی حذف شد' })
  @ApiResponse({ status: 404, description: 'علاقه‌مندی یافت نشد' })
  async removeBookmark(
    @CurrentUser() user: any,
    @Param('type') type: string,
    @Param('targetId') targetId: string,
  ) {
    return this.bookmarksService.removeBookmark(user.id, type, targetId);
  }
}
