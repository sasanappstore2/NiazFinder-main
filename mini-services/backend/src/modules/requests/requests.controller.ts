import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست درخواست‌ها (عمومی، صفحه‌بندی شده، قابل فیلتر)' })
  async findAll(@Query() query: QueryRequestsDto) {
    return this.requestsService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد درخواست جدید' })
  @ApiResponse({ status: 201, description: 'درخواست ایجاد شد' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.create(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درخواست‌های من (محافظت شده)' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  async getMyRequests(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRequestsDto,
  ) {
    return this.requestsService.findByUser(userId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'آمار کلی درخواست‌ها (عمومی)' })
  async getStats() {
    return this.requestsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات درخواست (عمومی)' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'شناسه سشن برای محدودیت بازدید' })
  @ApiResponse({ status: 200, description: 'جزئیات درخواست' })
  @ApiResponse({ status: 404, description: 'درخواست یافت نشد' })
  async findOne(
    @Param('id') id: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.requestsService.findById(id, sessionId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ویرایش درخواست (صاحب یا مدیر)' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'درخواست یافت نشد' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف درخواست (صاحب یا مدیر - حذف نرم)' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  @ApiResponse({ status: 404, description: 'درخواست یافت نشد' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requestsService.delete(id, userId);
  }
}
