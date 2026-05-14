import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsArray,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequestDto {
  @ApiProperty({ description: 'عنوان درخواست', example: 'طراحی وب‌سایت فروشگاهی' })
  @IsNotEmpty({ message: 'عنوان درخواست الزامی است' })
  @IsString()
  @MinLength(5, { message: 'عنوان باید حداقل ۵ کاراکتر باشد' })
  title: string;

  @ApiProperty({ description: 'توضیحات درخواست', example: 'نیاز به طراحی یک وب‌سایت فروشگاهی با قابلیت پرداخت آنلاین' })
  @IsNotEmpty({ message: 'توضیحات درخواست الزامی است' })
  @IsString()
  @MinLength(20, { message: 'توضیحات باید حداقل ۲۰ کاراکتر باشد' })
  description: string;

  @ApiProperty({ description: 'شناسه دسته‌بندی' })
  @IsNotEmpty({ message: 'دسته‌بندی الزامی است' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ description: 'حداقل بودجه (تومان)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'حداقل بودجه نمی‌تواند منفی باشد' })
  @Type(() => Number)
  budgetMin?: number;

  @ApiPropertyOptional({ description: 'حداکثر بودجه (تومان)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'حداکثر بودجه نمی‌تواند منفی باشد' })
  @Type(() => Number)
  budgetMax?: number;

  @ApiPropertyOptional({ description: 'نوع بودجه', enum: ['FIXED', 'HOURLY', 'NEGOTIABLE'] })
  @IsOptional()
  @IsIn(['FIXED', 'HOURLY', 'NEGOTIABLE'], { message: 'نوع بودجه نامعتبر است' })
  budgetType?: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';

  @ApiPropertyOptional({ description: 'زمان تحویل' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'زمان تحویل باید حداقل ۱ باشد' })
  @Type(() => Number)
  deliveryTime?: number;

  @ApiPropertyOptional({ description: 'واحد زمان تحویل', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month'], { message: 'واحد زمان تحویل نامعتبر است' })
  deliveryUnit?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'استان' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'اولویت', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'], { message: 'اولویت نامعتبر است' })
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ description: 'برچسب‌ها', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'هر برچسب باید رشته باشد' })
  tags?: string[];
}
