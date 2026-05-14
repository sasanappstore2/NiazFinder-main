import {
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'نام', example: 'علی' })
  @IsOptional()
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'نام خانوادگی', example: 'محمدی' })
  @IsOptional()
  @MinLength(2, { message: 'نام خانوادگی باید حداقل ۲ کاراکتر باشد' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'نام نمایشی', example: 'علی محمدی' })
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'بیوگرافی', example: 'توسعه‌دهنده فول‌استک با ۵ سال تجربه' })
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'شهر', example: 'تهران' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'استان', example: 'تهران' })
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ description: 'آدرس', example: 'خیابان ولیعصر، پلاک ۱۲۳' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'شماره موبایل',
    example: '09123456789',
    pattern: '^09[0-9]{9}$',
  })
  @IsOptional()
  @Matches(/^09[0-9]{9}$/, { message: 'شماره موبایل نامعتبر است. فرمت صحیح: 09xxxxxxxxx' })
  phone?: string;
}
