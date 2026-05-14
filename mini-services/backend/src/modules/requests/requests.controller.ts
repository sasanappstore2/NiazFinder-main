import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'لیست درخواست‌ها (عمومی)' })
  async findAll(@Query() query: QueryRequestsDto) {
    return this.requestsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'درخواست‌های ویژه' })
  async getFeatured() {
    return this.requestsService.getFeatured();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'درخواست‌های من' })
  async getMyRequests(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRequestsDto,
  ) {
    return this.requestsService.getByUser(userId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد درخواست جدید' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات درخواست' })
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ویرایش درخواست' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر وضعیت درخواست' })
  async changeStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('status') status: string,
  ) {
    return this.requestsService.changeStatus(id, userId, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف درخواست' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requestsService.delete(id, userId);
  }
}
