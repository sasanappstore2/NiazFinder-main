import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSpecialistProfileDto {
  @ApiPropertyOptional({ description: 'نام نمایشی', maxLength: 100 })
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ description: 'آدرس' })
  @IsOptional()
  @IsString()
  address?: string;
}
