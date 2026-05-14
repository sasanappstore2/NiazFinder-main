import { IsOptional, IsIn, IsString, IsBoolean, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'تعداد آیتم در هر صفحه', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ description: 'نقش کاربر', enum: ['CLIENT', 'SPECIALIST', 'ADMIN'] })
  @IsOptional()
  @IsIn(['CLIENT', 'SPECIALIST', 'ADMIN'])
  role?: string;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'عبارت جستجو' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'مرتب‌سازی', default: 'newest', enum: ['newest', 'oldest', 'rating', 'most_requests'] })
  @IsOptional()
  @IsString()
  sort?: string = 'newest';

  @ApiPropertyOptional({ description: 'وضعیت تأیید' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
