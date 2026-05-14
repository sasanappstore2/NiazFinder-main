import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Proposals')
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiQuery({ name: 'requestId', required: true, description: 'شناسه درخواست' })
  @ApiOperation({ summary: 'لیست پیشنهادهای یک درخواست (عمومی)' })
  async findByRequest(@Query('requestId') requestId: string) {
    if (!requestId) {
      throw new BadRequestException('شناسه درخواست الزامی است');
    }
    return this.proposalsService.findByRequest(requestId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پیشنهادهای من' })
  async getMyProposals(@CurrentUser('id') userId: string) {
    return this.proposalsService.findByUser(userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار پیشنهادهای من' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.proposalsService.getStats(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ارسال پیشنهاد جدید' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.create(userId, dto);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'قبول پیشنهاد' })
  async accept(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.proposalsService.accept(id, userId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رد پیشنهاد' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.proposalsService.reject(id, userId);
  }

  @Patch(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پس‌گرفتن پیشنهاد' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.proposalsService.withdraw(id, userId);
  }
}
