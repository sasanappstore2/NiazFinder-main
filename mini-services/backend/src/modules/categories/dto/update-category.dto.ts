import { IsOptional, IsString, IsInt, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'نام دسته‌بندی' })
  @IsOptional()
  @IsNotEmpty({ message: 'نام دسته‌بندی نمی‌تواند خالی باشد' })
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'اسلاگ دسته‌بندی' })
  @IsOptional()
  @IsNotEmpty({ message: 'اسلاگ دسته‌بندی نمی‌تواند خالی باشد' })
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'توضیحات دسته‌بندی' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'آیکون دسته‌بندی' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی والد' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'وضعیت فعال' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
