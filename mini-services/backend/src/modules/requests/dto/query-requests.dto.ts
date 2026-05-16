import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRequestsDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'تعداد در هر صفحه', default: 12, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50, { message: 'حداکثر ۵۰ مورد در هر صفحه قابل نمایش است' })
  @Type(() => Number)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'استان' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: 'وضعیت',
    enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'اولویت',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'جستجو در عنوان و توضیحات' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'مرتب‌سازی',
    enum: ['newest', 'oldest', 'budget_low', 'budget_high', 'most_proposals'],
    default: 'newest',
  })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'budget_low', 'budget_high', 'most_proposals'], {
    message: 'مرتب‌سازی نامعتبر است',
  })
  sort?: 'newest' | 'oldest' | 'budget_low' | 'budget_high' | 'most_proposals';
}
