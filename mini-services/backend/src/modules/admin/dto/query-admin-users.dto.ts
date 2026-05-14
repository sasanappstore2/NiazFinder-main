import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAdminUsersDto {
  @ApiPropertyOptional({ description: 'نقش کاربر' })
  @IsOptional()
  @IsIn(['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @ApiPropertyOptional({ description: 'وضعیت کاربر' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'banned'])
  status?: string;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'جستجو' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'مرتب‌سازی' })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'name'])
  sort?: string;

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
}
