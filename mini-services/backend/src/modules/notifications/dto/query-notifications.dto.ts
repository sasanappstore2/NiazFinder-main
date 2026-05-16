import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNotificationsDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'تعداد آیتم در هر صفحه', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'نوع اعلان برای فیلتر',
    enum: ['MESSAGE', 'PROPOSAL', 'REVIEW', 'PAYMENT', 'SYSTEM', 'ACHIEVEMENT', 'NEW_MESSAGE', 'NEW_PROPOSAL', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MESSAGE', 'PROPOSAL', 'REVIEW', 'PAYMENT', 'SYSTEM', 'ACHIEVEMENT', 'NEW_MESSAGE', 'NEW_PROPOSAL', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'])
  type?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس وضعیت خواندن (true/false)' })
  @IsOptional()
  @IsString()
  isRead?: string;
}
