import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ManageRequestDto {
  @ApiPropertyOptional({
    description: 'وضعیت درخواست',
    enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'ویژه بودن' })
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'مخفی بودن' })
  @IsOptional()
  isHidden?: boolean;

  @ApiPropertyOptional({ description: 'تاریخ بسته شدن', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  closedAt?: string;
}
