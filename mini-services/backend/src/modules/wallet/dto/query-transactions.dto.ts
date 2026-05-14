import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryTransactionsDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'تعداد آیتم در هر صفحه', default: 10 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'نوع تراکنش',
    enum: ['DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND', 'COMMISSION', 'BONUS', 'ESCROW_HOLD', 'ESCROW_RELEASE'],
  })
  @IsOptional()
  @IsIn(['DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND', 'COMMISSION', 'BONUS', 'ESCROW_HOLD', 'ESCROW_RELEASE'], {
    message: 'نوع تراکنش نامعتبر است',
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'وضعیت تراکنش',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'], {
    message: 'وضعیت تراکنش نامعتبر است',
  })
  status?: string;
}
