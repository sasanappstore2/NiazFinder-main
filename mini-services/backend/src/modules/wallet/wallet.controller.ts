import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { ChargeDto } from './dto/charge.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'اطلاعات کیف پول' })
  async getWallet(@CurrentUser() user: any) {
    return this.walletService.getWallet(user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'موجودی فعلی کیف پول' })
  async getBalance(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'تاریخچه تراکنش‌ها' })
  @ApiQuery({ name: 'page', required: false, description: 'شماره صفحه' })
  @ApiQuery({ name: 'limit', required: false, description: 'تعداد آیتم در هر صفحه' })
  @ApiQuery({ name: 'type', required: false, description: 'نوع تراکنش' })
  @ApiQuery({ name: 'status', required: false, description: 'وضعیت تراکنش' })
  async getTransactions(@CurrentUser() user: any, @Query() query: QueryTransactionsDto) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Post('charge')
  @ApiOperation({ summary: 'شارژ کیف پول' })
  @HttpCode(HttpStatus.OK)
  async charge(@CurrentUser() user: any, @Body() dto: ChargeDto) {
    return this.walletService.charge(user.id, dto);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'برداشت از کیف پول' })
  @HttpCode(HttpStatus.OK)
  async withdraw(@CurrentUser() user: any, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.id, dto);
  }
}
