import { IsInt, Min, IsOptional, MaxLength, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChargeDto {
  @ApiProperty({ description: 'مبلغ شارژ (ریال)', minimum: 10000 })
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(10000, { message: 'حداقل مبلغ شارژ ۱۰,۰۰۰ ریال است' })
  amount: number;

  @ApiPropertyOptional({ description: 'توضیحات', maxLength: 500 })
  @IsOptional()
  @MaxLength(500, { message: 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' })
  description?: string;
}
