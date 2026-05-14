import { IsNotEmpty, IsOptional, IsString, IsArray, IsUrl, IsDateString, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePortfolioDto {
  @ApiProperty({ description: 'عنوان نمونه‌کار' })
  @IsNotEmpty({ message: 'عنوان نمونه‌کار الزامی است' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'لینک تصاویر', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'لینک ویدیو' })
  @IsOptional()
  @IsUrl({}, { message: 'لینک ویدیو نامعتبر است' })
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'لینک پروژه' })
  @IsOptional()
  @IsUrl({}, { message: 'لینک پروژه نامعتبر است' })
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'نام مشتری' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'تاریخ تکمیل' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
