import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'ایمیل کاربر', example: 'user@example.com' })
  @IsEmail({}, { message: 'فرمت ایمیل نامعتبر است' })
  @IsNotEmpty({ message: 'ایمیل الزامی است' })
  email: string;

  @ApiProperty({ description: 'رمز عبور', example: 'password123' })
  @IsNotEmpty({ message: 'رمز عبور الزامی است' })
  password: string;
}
