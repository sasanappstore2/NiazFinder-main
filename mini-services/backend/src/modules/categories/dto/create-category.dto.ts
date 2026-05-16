import { IsNotEmpty, IsOptional, IsString, IsInt, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ description: 'نام دسته‌بندی', example: 'طراحی وب‌سایت' })
  @IsNotEmpty({ message: 'نام دسته‌بندی الزامی است' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'توضیحات دسته‌بندی' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'آیکون دسته‌بندی', example: 'Globe' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'تصویر دسته‌بندی (URL)' })
  @IsOptional()
  @IsUrl({}, { message: 'آدرس تصویر نامعتبر است' })
  image?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی والد' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;
}
