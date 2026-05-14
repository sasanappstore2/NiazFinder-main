import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySpecialistsDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'تعداد در هر صفحه', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'مهارت' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ description: 'جستجو' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'مرتب‌سازی', enum: ['rating', 'newest', 'most_projects'] })
  @IsOptional()
  @IsIn(['rating', 'newest', 'most_projects'])
  sort?: string = 'newest';
}
