import { IsInt, Min, IsOptional, MaxLength, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({ description: 'مبلغ برداشت (ریال)', minimum: 50000 })
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(50000, { message: 'حداقل مبلغ برداشت ۵۰,۰۰۰ ریال است' })
  amount: number;

  @ApiPropertyOptional({ description: 'شماره حساب بانکی', maxLength: 26 })
  @IsOptional()
  @IsString()
  @MaxLength(26, { message: 'شماره حساب بانکی نامعتبر است' })
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'نام بانک', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'نام بانک نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد' })
  bankName?: string;

  @ApiPropertyOptional({ description: 'توضیحات', maxLength: 500 })
  @IsOptional()
  @MaxLength(500, { message: 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' })
  description?: string;
}
