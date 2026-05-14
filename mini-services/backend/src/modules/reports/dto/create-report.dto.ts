import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ description: 'نوع هدف گزارش', enum: ['user', 'request', 'proposal', 'review'] })
  @IsNotEmpty()
  @IsIn(['user', 'request', 'proposal', 'review'])
  targetType: 'user' | 'request' | 'proposal' | 'review';

  @ApiProperty({ description: 'شناسه هدف گزارش' })
  @IsNotEmpty()
  @IsString()
  targetId: string;

  @ApiProperty({ description: 'دلیل گزارش', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'توضیحات بیشتر', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'گزارش ناشناس', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
