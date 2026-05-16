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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Proposals')
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ارسال پیشنهاد جدید (محافظت شده)' })
  @ApiResponse({ status: 201, description: 'پیشنهاد ایجاد شد' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  @ApiResponse({ status: 400, description: 'درخواست بسته است یا قبلاً پیشنهاد ارسال شده' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.create(userId, dto);
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'پیشنهادهای یک درخواست (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'لیست پیشنهادها' })
  @ApiResponse({ status: 404, description: 'درخواست یافت نشد' })
  async findByRequest(@Param('requestId') requestId: string) {
    return this.proposalsService.findByRequest(requestId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پیشنهادهای من (محافظت شده)' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  async getMyProposals(@CurrentUser('id') userId: string) {
    return this.proposalsService.findBySpecialist(userId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر وضعیت پیشنهاد (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'وضعیت تغییر کرد' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProposalStatusDto,
  ) {
    return this.proposalsService.updateStatus(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پس‌گرفتن پیشنهاد (محافظت شده)' })
  @ApiResponse({ status: 200, description: 'پیشنهاد پس گرفته شد' })
  @ApiResponse({ status: 401, description: 'نیاز به ورود' })
  @ApiResponse({ status: 403, description: 'دسترسی غیرمجاز' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.proposalsService.withdraw(id, userId);
  }
}
