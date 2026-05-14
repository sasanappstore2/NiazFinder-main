import { IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'رمز عبور فعلی' })
  @IsNotEmpty({ message: 'رمز عبور فعلی الزامی است' })
  oldPassword: string;

  @ApiProperty({ description: 'رمز عبور جدید', minLength: 6, maxLength: 128 })
  @IsNotEmpty({ message: 'رمز عبور جدید الزامی است' })
  @MinLength(6, { message: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' })
  @MaxLength(128, { message: 'رمز عبور جدید نمی‌تواند بیشتر از ۱۲۸ کاراکتر باشد' })
  newPassword: string;
}
