import { IsNotEmpty, IsOptional, IsString, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
