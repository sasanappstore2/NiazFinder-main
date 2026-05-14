import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'ایمیل کاربر', example: 'user@example.com' })
  @IsEmail({}, { message: 'فرمت ایمیل نامعتبر است' })
  @IsNotEmpty({ message: 'ایمیل الزامی است' })
  email: string;

  @ApiProperty({ description: 'رمز عبور', example: 'password123', minLength: 6, maxLength: 128 })
  @MinLength(6, { message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' })
  @MaxLength(128, { message: 'رمز عبور نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد' })
  @IsNotEmpty({ message: 'رمز عبور الزامی است' })
  password: string;

  @ApiProperty({ description: 'نام', example: 'علی' })
  @IsNotEmpty({ message: 'نام الزامی است' })
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' })
  firstName: string;

  @ApiPropertyOptional({ description: 'نام خانوادگی', example: 'محمدی' })
  @MinLength(2, { message: 'نام خانوادگی باید حداقل ۲ کاراکتر باشد' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'شماره موبایل',
    example: '09123456789',
    pattern: '^09[0-9]{9}$',
  })
  @IsOptional()
  @Matches(/^09[0-9]{9}$/, { message: 'شماره موبایل نامعتبر است. فرمت صحیح: 09xxxxxxxxx' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'نقش کاربر',
    enum: ['CLIENT', 'SPECIALIST'],
    default: 'CLIENT',
  })
  @IsOptional()
  @IsIn(['CLIENT', 'SPECIALIST'], { message: 'نقش باید CLIENT یا SPECIALIST باشد' })
  role?: 'CLIENT' | 'SPECIALIST';
}
