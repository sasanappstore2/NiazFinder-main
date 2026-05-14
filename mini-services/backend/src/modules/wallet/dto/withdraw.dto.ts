import { IsInt, Min, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawDto {
  @ApiProperty({ description: 'مبلغ برداشت (ریال)', minimum: 50000 })
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(50000, { message: 'حداقل مبلغ برداشت ۵۰,۰۰۰ ریال است' })
  amount: number;

  @ApiPropertyOptional({ description: 'توضیحات', maxLength: 500 })
  @IsOptional()
  @MaxLength(500, { message: 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' })
  description?: string;
}
