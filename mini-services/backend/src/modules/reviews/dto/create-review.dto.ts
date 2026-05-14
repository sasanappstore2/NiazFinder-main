import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'شناسه کاربری مورد نظر برای بررسی' })
  @IsNotEmpty({ message: 'شناسه کاربری الزامی است' })
  userId: string;

  @ApiProperty({ description: 'شناسه درخواست خدمت' })
  @IsNotEmpty({ message: 'شناسه درخواست الزامی است' })
  requestId: string;

  @ApiProperty({ description: 'امتیاز کلی (۱ تا ۵)', minimum: 1, maximum: 5 })
  @IsInt({ message: 'امتیاز باید عدد صحیح باشد' })
  @Min(1, { message: 'حداقل امتیاز ۱ است' })
  @Max(5, { message: 'حداکثر امتیاز ۵ است' })
  rating: number;

  @ApiPropertyOptional({ description: 'امتیاز کیفیت کار (۱ تا ۵)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt({ message: 'امتیاز کیفیت باید عدد صحیح باشد' })
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @ApiPropertyOptional({ description: 'امتیاز زمان‌بندی (۱ تا ۵)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt({ message: 'امتیاز زمان‌بندی باید عدد صحیح باشد' })
  @Min(1)
  @Max(5)
  timingRating?: number;

  @ApiPropertyOptional({ description: 'امتیاز ارتباط و مکاتبه (۱ تا ۵)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt({ message: 'امتیاز ارتباط باید عدد صحیح باشد' })
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ description: 'امتیاز حرفه‌ای بودن (۱ تا ۵)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt({ message: 'امتیاز حرفه‌ای بودن باید عدد صحیح باشد' })
  @Min(1)
  @Max(5)
  professionalismRating?: number;

  @ApiPropertyOptional({
    description: 'متن نظر',
    minLength: 20,
    maxLength: 2000,
  })
  @IsOptional()
  @MinLength(20, { message: 'نظر باید حداقل ۲۰ کاراکتر باشد' })
  @MaxLength(2000, { message: 'نظر نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد' })
  comment?: string;

  @ApiPropertyOptional({ description: 'نقاط قوت', maxLength: 500 })
  @IsOptional()
  @MaxLength(500, { message: 'نقاط قوت نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' })
  pros?: string;

  @ApiPropertyOptional({ description: 'نقاط ضعف', maxLength: 500 })
  @IsOptional()
  @MaxLength(500, { message: 'نقاط ضعف نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد' })
  cons?: string;

  @ApiPropertyOptional({ description: 'آیا کاربر را پیشنهاد می‌کنید؟' })
  @IsOptional()
  @IsBoolean({ message: 'مقدار باید بولی باشد' })
  isRecommended?: boolean;
}
