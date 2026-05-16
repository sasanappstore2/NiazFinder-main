import { IsOptional, IsString, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortfolioDto {
  @ApiPropertyOptional({ description: 'عنوان نمونه‌کار' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر' })
  @IsOptional()
  @IsUrl({}, { message: 'آدرس تصویر نامعتبر است' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'لینک پروژه' })
  @IsOptional()
  @IsUrl({}, { message: 'لینک پروژه نامعتبر است' })
  projectUrl?: string;

  @ApiPropertyOptional({ description: 'تکنولوژی‌های استفاده شده', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}
