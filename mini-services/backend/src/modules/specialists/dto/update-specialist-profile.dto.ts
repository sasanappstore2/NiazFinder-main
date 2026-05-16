import { IsOptional, IsString, IsInt, Min, Max, MaxLength, IsNumber, IsIn, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSpecialistProfileDto {
  @ApiPropertyOptional({ description: 'نام نمایشی', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'نام نمایشی نباید بیشتر از ۱۰۰ کاراکتر باشد' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'بیوگرافی', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'بیوگرافی نباید بیشتر از ۲۰۰۰ کاراکتر باشد' })
  bio?: string;

  @ApiPropertyOptional({ description: 'شهر' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'استان' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'مهارت‌ها', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'نرخ ساعتی (تومان)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'نرخ ساعتی نمی‌تواند منفی باشد' })
  @Type(() => Number)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'سال‌ها تجربه' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'وضعیت دسترسی', enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] })
  @IsOptional()
  @IsIn(['AVAILABLE', 'BUSY', 'UNAVAILABLE'])
  availability?: string;
}
