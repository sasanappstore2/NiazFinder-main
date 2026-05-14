import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت نظرات یک کاربر' })
  @ApiQuery({ name: 'userId', required: true, description: 'شناسه کاربر' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه' })
  async findByUser(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByUser(userId, { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'دریافت نظرات یک درخواست' })
  @ApiParam({ name: 'requestId', description: 'شناسه درخواست' })
  async findByRequest(@Param('requestId') requestId: string) {
    return this.reviewsService.findByRequest(requestId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت نظر جدید' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پاسخ به نظر' })
  @ApiParam({ name: 'id', description: 'شناسه نظر' })
  async respond(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: RespondReviewDto) {
    return this.reviewsService.respond(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف نظر' })
  @ApiParam({ name: 'id', description: 'شناسه نظر' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.delete(id, user.id);
  }
}
