import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'نام دسته‌بندی' })
  @IsNotEmpty({ message: 'نام دسته‌بندی الزامی است' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'اسلاگ دسته‌بندی' })
  @IsNotEmpty({ message: 'اسلاگ دسته‌بندی الزامی است' })
  @IsString()
  slug: string;

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

  @ApiPropertyOptional({ description: 'ترتیب نمایش', default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;
}
