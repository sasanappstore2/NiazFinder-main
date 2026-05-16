import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsArray,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRequestDto {
  @ApiPropertyOptional({ description: 'عنوان درخواست', example: 'طراحی وب‌سایت فروشگاهی' })
  @IsOptional()
  @IsNotEmpty({ message: 'عنوان نمی‌تواند خالی باشد' })
  @IsString()
  @MinLength(5, { message: 'عنوان باید حداقل ۵ کاراکتر باشد' })
  @MaxLength(200, { message: 'عنوان نباید بیشتر از ۲۰۰ کاراکتر باشد' })
  title?: string;

  @ApiPropertyOptional({ description: 'توضیحات درخواست' })
  @IsOptional()
  @IsNotEmpty({ message: 'توضیحات نمی‌تواند خالی باشد' })
  @IsString()
  @MinLength(20, { message: 'توضیحات باید حداقل ۲۰ کاراکتر باشد' })
  @MaxLength(5000, { message: 'توضیحات نباید بیشتر از ۵۰۰۰ کاراکتر باشد' })
  description?: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی' })
  @IsOptional()
  @IsNotEmpty({ message: 'دسته‌بندی نمی‌تواند خالی باشد' })
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'حداقل بودجه (تومان)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'حداکثر بودجه نمی‌تواند منفی باشد' })
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

  @ApiPropertyOptional({ description: 'واحد زمان تحویل', enum: ['day', 'hour', 'month'] })
  @IsOptional()
  @IsIn(['day', 'hour', 'month'], { message: 'واحد زمان تحویل نامعتبر است' })
  deliveryUnit?: 'day' | 'hour' | 'month';

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

  @ApiPropertyOptional({ description: 'وضعیت', enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], { message: 'وضعیت نامعتبر است' })
  status?: string;

  @ApiPropertyOptional({ description: 'برچسب‌ها', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'هر برچسب باید رشته باشد' })
  tags?: string[];
}
