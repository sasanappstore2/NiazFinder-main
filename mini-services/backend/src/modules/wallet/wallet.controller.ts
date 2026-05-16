import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کیف پول (محافظت شده)' })
  async getWallet(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تاریخچه تراکنش‌ها (محافظت شده)' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه' })
  @ApiQuery({ name: 'type', required: false, description: 'نوع تراکنش' })
  @ApiQuery({ name: 'status', required: false, description: 'وضعیت تراکنش' })
  async getTransactions(@CurrentUser() user: any, @Query() query: QueryTransactionsDto) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'آمار کیف پول (محافظت شده)' })
  async getWalletStats(@CurrentUser() user: any) {
    return this.walletService.getWalletStats(user.id);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'شارژ کیف پول (محافظت شده)' })
  @HttpCode(HttpStatus.OK)
  async deposit(@CurrentUser() user: any, @Body() dto: ChargeDto) {
    return this.walletService.deposit(user.id, dto);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'برداشت از کیف پول (محافظت شده)' })
  @HttpCode(HttpStatus.OK)
  async withdraw(@CurrentUser() user: any, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.id, dto);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'انتقال وجه (محافظت شده)' })
  @HttpCode(HttpStatus.OK)
  async transfer(
    @CurrentUser() user: any,
    @Body() body: {
      toUserId: string;
      amount: number;
      description?: string;
      requestId?: string;
    },
  ) {
    return this.walletService.transfer(
      user.id,
      body.toUserId,
      body.amount,
      body.description,
      body.requestId,
    );
  }

  // Admin routes
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'برداشت‌های در انتظار (مدیران)' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه' })
  async getPendingWithdrawals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getPendingWithdrawals({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Put('admin/:transactionId/approve')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تأیید برداشت (مدیران)' })
  @ApiParam({ name: 'transactionId', description: 'شناسه تراکنش' })
  async approveWithdrawal(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: any,
  ) {
    return this.walletService.processWithdrawal(transactionId, user.id, true);
  }

  @Put('admin/:transactionId/reject')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رد برداشت (مدیران)' })
  @ApiParam({ name: 'transactionId', description: 'شناسه تراکنش' })
  async rejectWithdrawal(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: any,
  ) {
    return this.walletService.processWithdrawal(transactionId, user.id, false);
  }
}
