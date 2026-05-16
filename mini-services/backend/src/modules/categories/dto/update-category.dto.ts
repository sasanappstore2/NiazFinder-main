import { IsOptional, IsString, IsInt, IsBoolean, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'نام دسته‌بندی' })
  @IsOptional()
  @IsNotEmpty({ message: 'نام دسته‌بندی نمی‌تواند خالی باشد' })
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'توضیحات دسته‌بندی' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'آیکون دسته‌بندی' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'تصویر دسته‌بندی (URL)' })
  @IsOptional()
  @IsUrl({}, { message: 'آدرس تصویر نامعتبر است' })
  image?: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;

  @ApiPropertyOptional({ description: 'وضعیت فعال' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
