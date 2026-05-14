import { IsNotEmpty, IsIn, IsInt, IsString, Min, Max, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: 'کد تخفیف' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'نوع تخفیف', enum: ['PERCENTAGE', 'FIXED'] })
  @IsNotEmpty()
  @IsIn(['PERCENTAGE', 'FIXED'])
  type: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ description: 'مقدار تخفیف' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'حداقل سفارش' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({ description: 'حداکثر دفعات استفاده' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'تاریخ شروع' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'تاریخ انقضا' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
