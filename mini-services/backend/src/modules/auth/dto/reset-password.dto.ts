import { IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'توکن بازنشانی رمز عبور' })
  @IsNotEmpty({ message: 'توکن الزامی است' })
  token: string;

  @ApiProperty({
    description: 'رمز عبور جدید',
    minLength: 8,
    maxLength: 128,
    example: 'Password123',
  })
  @IsNotEmpty({ message: 'رمز عبور جدید الزامی است' })
  @MinLength(8, { message: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد' })
  @MaxLength(128, { message: 'رمز عبور جدید نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'رمز عبور باید حداقل یک حرف بزرگ انگلیسی و یک عدد داشته باشد',
  })
  newPassword: string;
}
